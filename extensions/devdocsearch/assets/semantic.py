"""Local passage embeddings and exact cosine search for DocSearch.

The model runs in a separate process so Raycast never holds its weights.
"""

import argparse
import atexit
import hashlib
import json
import os
import re
import sqlite3
import sys
import time
from contextlib import closing
import urllib.error
import urllib.request
from functools import lru_cache
from pathlib import Path

import numpy as np

MODEL_ID = "agentmish/pplx-embed-v1-0.6b-mlx@edc2b94227d1e4b8e185c1cf6db7d20d6759879b"
DIMENSIONS = 1024
CHUNKER_VERSION = "title-headings-300-40-v4"


class PauseRequested(Exception):
    """The current committed passage batch is the resume checkpoint."""


def chunk_markdown(markdown: str, max_words: int = 300, overlap_words: int = 40) -> list[str]:
    """Keep nearby prose and its heading together, with a small boundary overlap."""
    if not 0 <= overlap_words < max_words:
        raise ValueError("overlap_words must be smaller than max_words")
    paragraphs = re.split(r"\n\s*\n", markdown.strip())
    chunks: list[str] = []
    heading = ""
    words: list[str] = []
    fresh_words = 0

    def flush() -> None:
        nonlocal words, fresh_words
        if fresh_words:
            prefix = heading.split() if heading else []
            chunks.append(" ".join(prefix + words).strip())
            words = words[-overlap_words:] if overlap_words else []
            fresh_words = 0

    for paragraph in paragraphs:
        content = paragraph.strip()
        if not content:
            continue
        if content.startswith("#") and re.match(r"^#{1,6}\s", content):
            next_heading = content.splitlines()[0].lstrip("# ").strip()
            if fresh_words >= max_words // 2:
                flush()
                words = []
                fresh_words = 0
            elif words:
                heading_words = next_heading.split()
                words.extend(heading_words)
                fresh_words += len(heading_words)
            heading = next_heading
            content = "\n".join(content.splitlines()[1:]).strip()
        tokens = content.split()
        while tokens:
            room = max_words - len(words)
            if room <= 0:
                flush()
                room = max_words - len(words)
            words.extend(tokens[:room])
            fresh_words += min(room, len(tokens))
            tokens = tokens[room:]
            if tokens:
                flush()
        if len(words) >= max_words:
            flush()
    if fresh_words:
        chunks.append(" ".join(([heading] if heading else []) + words).strip())
    return [chunk for chunk in chunks if chunk]


def index_path(snapshot: Path, model_id: str) -> Path:
    if model_id == MODEL_ID:
        return snapshot / "semantic.sqlite"
    digest = hashlib.sha256(model_id.encode()).hexdigest()[:16]
    return snapshot / f"semantic-{digest}.sqlite"


def _open_index(snapshot: Path, model_id: str) -> sqlite3.Connection:
    db = sqlite3.connect(index_path(snapshot, model_id))
    db.execute("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)")
    db.execute("CREATE TABLE IF NOT EXISTS chunks (url TEXT NOT NULL, position INTEGER NOT NULL, text TEXT NOT NULL, vector BLOB NOT NULL, PRIMARY KEY(url, position))")
    db.execute("CREATE TABLE IF NOT EXISTS indexed_pages (url TEXT PRIMARY KEY)")
    return db


def index_snapshot(snapshot: Path, embedder, model_id: str = MODEL_ID, progress=None,
                   max_passages: int | None = None, passage_batch_size: int = 8,
                   should_pause=None) -> int:
    source = snapshot / "index.sqlite"
    if not source.is_file():
        raise FileNotFoundError(source)
    with closing(sqlite3.connect(f"file:{source}?mode=ro", uri=True)) as pages, closing(_open_index(snapshot, model_id)) as vectors:
        old_model = vectors.execute("SELECT value FROM meta WHERE key='model'").fetchone()
        old_chunker = vectors.execute("SELECT value FROM meta WHERE key='chunker'").fetchone()
        existing = vectors.execute("SELECT COUNT(*) FROM indexed_pages").fetchone()[0]
        if (old_model and old_model[0] != model_id) or (existing and (not old_chunker or old_chunker[0] != CHUNKER_VERSION)):
            vectors.execute("DELETE FROM chunks")
            vectors.execute("DELETE FROM indexed_pages")
            vectors.execute("DELETE FROM meta WHERE key IN ('dimensions', 'dtype')")
        vectors.execute("INSERT OR REPLACE INTO meta VALUES ('model', ?)", (model_id,))
        vectors.execute("INSERT OR REPLACE INTO meta VALUES ('chunker', ?)", (CHUNKER_VERSION,))
        vectors.execute("INSERT OR REPLACE INTO meta VALUES ('complete', '0')")
        vectors.execute("INSERT OR REPLACE INTO meta VALUES ('pid', ?)", (str(os.getpid()),))
        vectors.commit()
        rows = pages.execute("SELECT url, title FROM pages ORDER BY url").fetchall()
        done = {row[0] for row in vectors.execute("SELECT url FROM indexed_pages")}
        remaining = max_passages
        for index, (url, title) in enumerate(rows, 1):
            current = snapshot.parent.parent / "current.json"
            if current.is_file() and json.loads(current.read_text()).get("snapshot") != snapshot.name:
                raise RuntimeError(f"Indexing stopped: snapshot {snapshot.name} was superseded")
            if url in done:
                continue
            markdown = pages.execute("SELECT markdown FROM pages WHERE url=?", (url,)).fetchone()[0]
            passages = [f"{title}\n\n{passage}" for passage in chunk_markdown(markdown)]
            existing = vectors.execute("SELECT COUNT(*) FROM chunks WHERE url=?", (url,)).fetchone()[0]
            if existing > len(passages):
                raise ValueError(f"Saved passage count changed for {url}; rebuild this vector index.")
            stored = existing
            for start in range(existing, len(passages), passage_batch_size):
                if should_pause and should_pause():
                    raise PauseRequested()
                if remaining is not None and remaining <= 0:
                    break
                batch = passages[start:start + min(passage_batch_size, remaining if remaining is not None else passage_batch_size)]
                dtype = np.int8 if model_id == MODEL_ID else np.float32
                embeddings = np.asarray(embedder.encode(batch, batch_size=4), dtype=dtype)
                if embeddings.ndim != 2 or embeddings.shape[0] != len(batch):
                    raise ValueError(f"Unexpected embedding shape: {embeddings.shape}")
                dimensions = embeddings.shape[1]
                previous = vectors.execute("SELECT value FROM meta WHERE key='dimensions'").fetchone()
                if previous and int(previous[0]) != dimensions:
                    raise ValueError("Embedding dimensions changed for the same model. Reindex with a new model ID.")
                with vectors:
                    vectors.execute("INSERT OR REPLACE INTO meta VALUES ('dimensions', ?)", (str(dimensions),))
                    vectors.execute("INSERT OR REPLACE INTO meta VALUES ('dtype', ?)", ("int8" if dtype == np.int8 else "float32",))
                    vectors.executemany("INSERT INTO chunks VALUES (?, ?, ?, ?)",
                                        ((url, position, passage, embedding.tobytes())
                                         for position, (passage, embedding) in enumerate(zip(batch, embeddings), start)))
                    vectors.executemany("INSERT OR REPLACE INTO meta VALUES (?, ?)", [
                        ("current_url", url), ("current_passages", str(start + len(batch))),
                        ("total_passages", str(len(passages))),
                    ])
                if remaining is not None:
                    remaining -= len(batch)
                stored += len(batch)
            if stored < len(passages):
                break
            with vectors:
                vectors.execute("INSERT OR REPLACE INTO indexed_pages VALUES (?)", (url,))
                vectors.execute("DELETE FROM meta WHERE key IN ('current_url', 'current_passages', 'total_passages')")
            if progress and (index % 10 == 0 or index == len(rows)):
                progress(index, len(rows), snapshot)
            if remaining is not None and remaining <= 0:
                break
        indexed = vectors.execute("SELECT COUNT(*) FROM indexed_pages").fetchone()[0]
        vectors.execute("INSERT OR REPLACE INTO meta VALUES ('complete', ?)", ("1" if indexed == len(rows) else "0",))
        if indexed == len(rows):
            vectors.execute("DELETE FROM meta WHERE key='pid'")
        vectors.commit()
        return vectors.execute("SELECT COUNT(*) FROM chunks").fetchone()[0]


@lru_cache(maxsize=8)
def _load_vectors(snapshots: tuple[tuple[Path, int], ...], model_id: str):
    records = []
    matrices = []
    for snapshot, _version in snapshots:
        path = index_path(snapshot, model_id)
        if not path.is_file():
            continue
        # Some crawlers expose the same Markdown under several dialect routes.
        # Search one canonical copy so these routes cannot fill the top results.
        with sqlite3.connect(f"file:{snapshot / 'index.sqlite'}?mode=ro", uri=True) as pages:
            canonical_by_content = {}
            content_by_url = {}
            for url, title, markdown in pages.execute("SELECT url, title, markdown FROM pages"):
                content = hashlib.sha256((title + "\n" + markdown).encode()).digest()
                content_by_url[url] = content
                prior = canonical_by_content.get(content)
                if prior is None or (len(url), url) < (len(prior), prior):
                    canonical_by_content[content] = url
        with sqlite3.connect(f"file:{path}?mode=ro", uri=True) as db:
            meta = dict(db.execute("SELECT key, value FROM meta"))
            if meta.get("model") != model_id or meta.get("complete") != "1" or meta.get("chunker") != CHUNKER_VERSION:
                continue
            for url, position, passage, vector in db.execute("SELECT url, position, text, vector FROM chunks"):
                if canonical_by_content.get(content_by_url.get(url)) != url:
                    continue
                dtype = np.float32 if meta.get("dtype") == "float32" else np.int8
                values = np.frombuffer(vector, dtype=dtype)
                if len(values) != int(meta.get("dimensions", DIMENSIONS)):
                    raise ValueError(f"Unexpected vector size in {path}")
                records.append((snapshot, url, position, passage))
                matrices.append(values)
    if not records:
        return records, None
    import faiss
    matrix = np.asarray(matrices, dtype=np.float32)
    faiss.normalize_L2(matrix)
    index = faiss.IndexFlatIP(matrix.shape[1])
    index.add(matrix)
    return records, index


def search_snapshots(query: str, snapshots: list[Path], embedder, model_id: str = MODEL_ID, limit: int = 30):
    versions = tuple((path, index_path(path, model_id).stat().st_mtime_ns if index_path(path, model_id).exists() else 0)
                     for path in snapshots)
    records, index = _load_vectors(versions, model_id)
    if index is None:
        return []
    import faiss
    vector = np.asarray(embedder.encode([query]), dtype=np.float32)
    if vector.shape != (1, index.d):
        raise ValueError(f"Query vector has shape {vector.shape}; index expects {index.d} dimensions")
    faiss.normalize_L2(vector)
    distances, positions = index.search(vector, min(limit * 4, len(records)))
    results = []
    seen = set()
    for score, position in zip(distances[0], positions[0]):
        snapshot, url, chunk_position, passage = records[int(position)]
        if url in seen:
            continue
        seen.add(url)
        body = passage.split("\n\n", 1)[-1]
        results.append({"snapshot": str(snapshot), "url": url, "position": chunk_position,
                        "excerpt": re.sub(r"[#*`\n]+", " ", body).strip()[:260], "score": float(score)})
        if len(results) >= limit:
            break
    return results


def current_snapshots(base: Path) -> list[Path]:
    snapshots = []
    for current in base.glob("*/current.json"):
        data = json.loads(current.read_text())
        if data.get("snapshot"):
            snapshots.append(current.parent / "snapshots" / data["snapshot"])
    return snapshots


def index_complete(snapshot: Path, model_id: str) -> bool:
    path = index_path(snapshot, model_id)
    if not path.is_file():
        return False
    with closing(sqlite3.connect(f"file:{path}?mode=ro", uri=True)) as db:
        meta = dict(db.execute("SELECT key, value FROM meta"))
        if meta.get("model") != model_id or meta.get("chunker") != CHUNKER_VERSION or meta.get("complete") != "1":
            return False
        indexed = db.execute("SELECT COUNT(*) FROM indexed_pages").fetchone()[0]
    with closing(sqlite3.connect(f"file:{snapshot / 'index.sqlite'}?mode=ro", uri=True)) as pages:
        total = pages.execute("SELECT COUNT(*) FROM pages").fetchone()[0]
    return indexed == total


def backfill_snapshots(base: Path, embedder, model_id: str, max_passages: int = 32, progress=None,
                       should_pause=None) -> None:
    idle_checks = 0
    while True:
        if should_pause and should_pause():
            return
        pending = False
        for snapshot in current_snapshots(base):
            if should_pause and should_pause():
                return
            if index_complete(snapshot, model_id):
                continue
            try:
                index_snapshot(snapshot, embedder, model_id, max_passages=max_passages,
                               should_pause=should_pause)
            except PauseRequested:
                return
            except RuntimeError as error:
                if "was superseded" in str(error):
                    continue
                raise
            if progress:
                progress(snapshot)
            pending = pending or not index_complete(snapshot, model_id)
        if not pending:
            idle_checks += 1
            if idle_checks >= 2:
                return
            time.sleep(1)
        else:
            idle_checks = 0


class LocalEmbedder:
    def __init__(self, model_id: str = MODEL_ID):
        import mlx.core as mx
        mx.set_cache_limit(256 * 1024 * 1024)
        self.model = load_model(model_id)

    def encode(self, texts, **_kwargs):
        import mlx.core as mx
        vectors = self.model.encode(texts, batch_size=4, quantization="int8")
        mx.clear_cache()
        return vectors


class EndpointEmbedder:
    def __init__(self, provider: str, endpoint: str, model: str, api_key_file: str | None):
        self.provider, self.endpoint, self.model = provider, endpoint, model
        self.api_key_file = api_key_file

    def encode(self, texts, batch_size=8, **_kwargs):
        batches = []
        for start in range(0, len(texts), batch_size):
            batch = texts[start:start + batch_size]
            payload = {"model": self.model, "input": batch}
            base = self.endpoint.rstrip("/")
            suffix = "/api/embed" if self.provider == "ollama" else "/embeddings"
            target = base if base.endswith(suffix) else base + suffix
            headers = {"Content-Type": "application/json"}
            if self.api_key_file:
                headers["Authorization"] = "Bearer " + Path(self.api_key_file).read_text().strip()
            request = urllib.request.Request(target, data=json.dumps(payload).encode(), headers=headers, method="POST")
            try:
                with urllib.request.urlopen(request, timeout=90) as response:
                    data = json.load(response)
            except urllib.error.HTTPError as error:
                raise RuntimeError(f"Embedding endpoint returned HTTP {error.code}") from error
            if self.provider == "ollama":
                vectors = data.get("embeddings")
            else:
                rows = data.get("data", [])
                vectors = [row["embedding"] for row in sorted(rows, key=lambda row: row["index"])]
            if not isinstance(vectors, list) or len(vectors) != len(batch):
                raise ValueError("Embedding endpoint returned an unexpected batch size")
            batches.extend(vectors)
        matrix = np.asarray(batches, dtype=np.float32)
        if matrix.ndim != 2 or not np.isfinite(matrix).all():
            raise ValueError("Embedding endpoint returned invalid vectors")
        return matrix


def load_config(path: Path | None):
    if path is None or not path.is_file():
        return LocalEmbedder(), MODEL_ID
    data = json.loads(path.read_text())
    provider = data["provider"]
    if provider == "mlx":
        model_id = data.get("model") or MODEL_ID
        if not re.fullmatch(r"agentmish/pplx-embed-v1-0\.6b-mlx@[0-9a-f]{40}", model_id):
            raise ValueError("Unsupported local MLX embedding model")
        return LocalEmbedder(model_id), model_id
    if provider not in ("openai", "ollama"):
        raise ValueError("Unknown embedding provider")
    endpoint, model = data["endpoint"], data["model"]
    identity = hashlib.sha256(json.dumps([provider, endpoint, model], separators=(",", ":")).encode()).hexdigest()
    return EndpointEmbedder(provider, endpoint, model, data.get("apiKeyFile")), f"{provider}:{identity}"


def load_model(model_id: str = MODEL_ID):
    from pplx_mlx_convert.embeddings import load_embedder
    from huggingface_hub import snapshot_download
    repo, revision = model_id.split("@", 1)
    caches = [Path.home() / ".context/docsearch-models/hub",
              Path.home() / ".models/huggingface/hub",
              Path.home() / ".cache/huggingface/hub"]
    for cache in caches:
        if not cache.is_dir():
            continue
        try:
            path = snapshot_download(repo, revision=revision, cache_dir=cache,
                                     allow_patterns=["*.json", "*.safetensors", "*.txt", "*.py", "pplx_mlx_convert/*.py"],
                                     local_files_only=True)
            return load_embedder(path)
        except FileNotFoundError:
            continue
    raise FileNotFoundError("Local Perplexity embedding model was not found. Run scripts/setup-semantic.sh.")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["index", "backfill", "serve", "query"])
    parser.add_argument("path", nargs="?", type=Path)
    parser.add_argument("--query")
    parser.add_argument("--config", type=Path)
    args = parser.parse_args()
    if args.mode in ("index", "backfill"):
        base = args.path if args.mode == "backfill" and args.path else Path.home() / ".context" / "docs"
        lock_path = base / "semantic-worker.sqlite"
        lock_path.parent.mkdir(parents=True, exist_ok=True)
        lock = sqlite3.connect(lock_path, timeout=3600, isolation_level=None)
        lock.execute("BEGIN EXCLUSIVE")
        atexit.register(lock.close)
        pid_path = lock_path.with_suffix(".pid")
        pid_path.write_text(str(os.getpid()))
        atexit.register(lambda: pid_path.unlink(missing_ok=True))
        pause_path = lock_path.with_suffix(".pause")
        if pause_path.exists():
            return
    model, model_id = load_config(args.config)
    if args.mode == "index":
        if args.path is None:
            parser.error("index requires a snapshot path")
        count = index_snapshot(args.path, model, model_id, progress=lambda done, total, _: print(json.dumps({"done": done, "total": total}), flush=True))
        print(json.dumps({"chunks": count}), flush=True)
    elif args.mode == "backfill":
        if args.path is None:
            parser.error("backfill requires a docs directory")
        backfill_snapshots(args.path, model, model_id,
                           progress=lambda snapshot: print(json.dumps({"snapshot": str(snapshot)}), flush=True),
                           should_pause=pause_path.exists)
    elif args.mode == "query":
        if args.path is None or not args.query:
            parser.error("query requires a docs directory and --query")
        print(json.dumps(search_snapshots(args.query, current_snapshots(args.path), model, model_id)), flush=True)
    else:
        for line in sys.stdin:
            request = json.loads(line)
            try:
                snapshots = [Path(path) for path in request["snapshots"]]
                matches = search_snapshots(request["query"], snapshots, model, model_id)
                print(json.dumps({"id": request["id"], "matches": matches}), flush=True)
            except Exception as error:
                print(json.dumps({"id": request.get("id"), "error": str(error)}), flush=True)


if __name__ == "__main__":
    main()
