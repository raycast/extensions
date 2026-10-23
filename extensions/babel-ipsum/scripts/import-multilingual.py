"""Acquire and replay seven original-language corpora without third-party packages.

Default: replay optional cached source snapshots, with no network access.
--audit: verify full extraction against prepared books without rewriting them.
--fetch: acquire missing snapshots; existing snapshots are never overwritten.
--books ID ...: process selected books (default: all seven).

The retained manifest records the actual response URL, byte encoding, retrieval
date, and SHA-256. Aozora's original Shift_JIS bytes are deliberately retained.
Sampling always selects complete source units, in source order, without padding.
"""

import argparse
import hashlib
import importlib.util
import json
import re
import time
import unicodedata
from datetime import date
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
TARGET_BYTES = 284192
spec = importlib.util.spec_from_file_location("extract_corpus", ROOT / "scripts/extract-corpus.py")
extractor = importlib.util.module_from_spec(spec)
spec.loader.exec_module(extractor)
Element = extractor.Element
BOOK_IDS = (
    "journey-to-the-west", "kokoro", "jindallae-kkot", "oedipus-tyrannus",
    "the-broken-wings", "crime-and-punishment", "godaan",
)


def parse(html):
    parser = extractor.StoryParser()
    parser.feed(html)
    return parser.root


def classes(node):
    return set(node.attrs.get("class", "").split())


def content(root):
    containers = [n for n in root.walk() if "mw-parser-output" in classes(n)]
    if not containers:
        raise ValueError("Missing MediaWiki source text container")
    return max(containers, key=lambda n: sum(c.tag == "p" for c in n.walk()))


def excluded(node):
    return node.excluded() or node.tag in {"rt", "rp"} or node.attrs.get("id") in {
        "headerContainer", "ws-data", "mw-navigation",
    } or bool(classes(node) & {"licenseContainer", "licensetpl", "ws-header", "pagetext"})


def allowed(node):
    while node:
        if excluded(node):
            return False
        node = node.parent
    return True


def text(node):
    if isinstance(node, str):
        return node
    if excluded(node):
        return ""
    if node.tag == "br":
        return "\n"
    if node.tag == "img":
        # Decode Aozora's explicit JIS X 0213 coordinate, rather than emitting
        # its descriptive alt label or guessing a visually similar character.
        coordinate = re.search(r"/([12])-(\d+)-(\d+)\.png$", node.attrs.get("src", ""))
        if "gaiji" not in classes(node) or not coordinate:
            raise ValueError(f"Unexpected inline image in source prose: {node.attrs}")
        plane, row, cell = map(int, coordinate.groups())
        encoded = bytes([row + 0xA0, cell + 0xA0])
        return (b"\x8f" + encoded if plane == 2 else encoded).decode("euc_jis_2004")
    return "".join(text(c) for c in node.children)


def normalize(value, verse=False):
    value = unicodedata.normalize("NFC", value).replace("\u00ad", "").replace("\u200b", "")
    if verse:
        return "\n".join(re.sub(r"[^\S\n]+", " ", line).strip() for line in value.splitlines()).strip()
    return re.sub(r"\s+", " ", value).strip()


class Snapshots:
    def __init__(self, book_id, fetch=False):
        self.directory = ROOT / ".cache/corpus/sources" / book_id
        self.path = ROOT / "corpus/provenance" / f"{book_id}.json"
        self.ledger = json.loads(self.path.read_text()) if self.path.exists() else {}
        self.manifest = ({Path(item["snapshotPath"]).name: item for item in self.ledger["snapshots"]}
                         if "snapshots" in self.ledger else self.ledger)
        self.fetch = fetch

    def get(self, filename, url, encoding="utf-8"):
        path = self.directory / filename
        if not path.exists():
            if not self.fetch:
                raise FileNotFoundError(f"Missing {path}; run --fetch to acquire it")
            encoded = quote(url, safe=":/?=&%#")
            for attempt in range(4):
                try:
                    request = Request(encoded, headers={"User-Agent": "BabelIpsumCorpus/1.0 (https://git.cafe/felrov/vibed-ipsum)"})
                    with urlopen(request, timeout=60) as response:
                        raw = response.read()
                        actual_url = response.url
                    if encoding == "auto":
                        declared = re.search(br'charset\s*=\s*["\x27]?([\w-]+)', raw[:4096], re.I)
                        if not declared:
                            raise ValueError(f"Missing declared source charset: {url}")
                        encoding = declared.group(1).decode("ascii")
                    raw.decode(encoding)  # Reject an unexpected source encoding.
                    self.directory.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(raw)
                    self.record(filename, {
                        "sourceUrl": url, "responseUrl": actual_url, "encoding": encoding,
                        "retrievedOn": date.today().isoformat(),
                        "sha256": hashlib.sha256(raw).hexdigest(),
                    })
                    time.sleep(0.6)
                    break
                except (HTTPError, URLError, TimeoutError) as error:
                    if isinstance(error, HTTPError) and error.code not in {429, 500, 502, 503, 504}:
                        raise
                    if attempt == 3:
                        raise
                    time.sleep(2 ** (attempt + 1))
        raw = path.read_bytes()
        metadata = self.verify(filename, url, raw)
        return raw.decode(metadata["encoding"]), metadata

    def verify(self, filename, url, raw):
        metadata = self.manifest[filename]
        expected = metadata.get("sha256", metadata.get("snapshotSha256"))
        if metadata["sourceUrl"] != url or hashlib.sha256(raw).hexdigest() != expected:
            raise ValueError(f"Snapshot provenance mismatch: {self.directory / filename}")
        raw.decode(metadata["encoding"])
        return metadata

    def record(self, filename, metadata):
        if "snapshots" in self.ledger:
            metadata["snapshotPath"] = (self.directory / filename).relative_to(ROOT).as_posix()
            metadata["snapshotSha256"] = metadata.pop("sha256")
            self.ledger["snapshots"].append(metadata)
        else:
            self.ledger[filename] = metadata
        self.manifest[filename] = metadata
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self.ledger, ensure_ascii=False, indent=2) + "\n")

    def section(self, filename, url, title, identifier, position, units, fragment=""):
        raw = (self.directory / filename).read_bytes()
        html = raw.decode(self.manifest[filename]["encoding"])
        revision = re.search(r'"wgRevisionId"\s*:\s*(\d+)', html) or re.search(r"/revision/(\d+)", html)
        if "wikisource.org" in url and not revision:
            raise ValueError(f"Missing source revision: {url}")
        revision_url = (f"https://{urlsplit(url).netloc}/w/index.php?oldid={revision.group(1)}"
                        if revision else url)
        # Chinese conversion is part of the selected transcription, even at a pinned revision.
        if urlsplit(url).netloc == "zh.wikisource.org":
            revision_url += "&variant=zh-hant"
        return {
            "id": identifier, "title": title, "position": position,
            "sourceUrl": url + fragment, "revisionUrl": revision_url + fragment,
            "snapshotPath": str((self.directory / filename).relative_to(ROOT)),
            "snapshotSha256": hashlib.sha256(raw).hexdigest(),
            "passages": [{"position": i, "text": value, "kind": kind} for i, value, kind in units],
        }


def sample(units, target):
    """Spread a byte allowance over complete units, preserving source positions.

    A deterministic binary subdivision visits the beginning, end, midpoint,
    quarter points, etc. Oversized units are skipped rather than truncated.
    """
    if sum(len(value.encode()) for _, value, _ in units) <= target:
        return units
    order = []
    queue = [(0, len(units) - 1)]
    if units:
        order.extend([0, len(units) - 1])
    while queue:
        low, high = queue.pop(0)
        middle = (low + high) // 2
        if middle not in order:
            order.append(middle)
        if low < middle:
            queue.append((low, middle - 1))
        if middle < high:
            queue.append((middle + 1, high))
    selected, size = set(), 0
    for index in order:
        width = len(units[index][1].encode())
        if size + width <= target:
            selected.add(index)
            size += width
    return [unit for index, unit in enumerate(units) if index in selected]


def chinese_units(html):
    container = content(parse(html))
    units = []
    for node in container.walk():
        if not allowed(node):
            continue
        if node.tag == "p" and not any(a.tag == "dl" for a in ancestors(node)):
            value, kind = normalize(text(node)), "prose"
        elif node.tag == "dl" and not any(a.tag == "dl" for a in ancestors(node)):
            lines = [normalize(text(n), verse=True) for n in node.walk() if n.tag == "dd"]
            value, kind = normalize("\n".join(lines), verse=True), "verse"
        else:
            continue
        if value:
            units.append((len(units) + 1, value, kind))
    return units


def ancestors(node):
    node = node.parent
    while node:
        yield node
        node = node.parent


def japanese_sections(html):
    """Aozora's physical <br> lines are prose paragraphs, not ruby readings."""
    root = parse(html)
    main = next(n for n in root.walk() if "main_text" in classes(n))
    sections, part, heading, lines = [], "", None, []

    def flush():
        nonlocal lines
        if heading:
            paragraphs = [normalize(line) for line in "".join(lines).split("\n")]
            units = [(i + 1, value, "prose") for i, value in enumerate(p for p in paragraphs if p)]
            sections.append((part, *heading, units))
        lines = []

    for node in main.children:
        if isinstance(node, Element):
            headings = [n for n in node.walk() if n.tag in {"h3", "h4"}]
            if headings:
                flush()
                for h in headings:
                    if h.tag == "h3":
                        part, heading = normalize(text(h)), None
                    else:
                        anchor = next(n for n in h.walk() if n.tag == "a")
                        heading = (normalize(text(h)), anchor.attrs["id"])
                continue
        lines.append(text(node))
    flush()
    return sections


def hindi_units(html, chapter):
    container = content(parse(html))
    units = []
    chapter_names = {
        1: "एक", 4: "चार", 7: "सात", 10: "दस", 14: "चौदह", 17: "सत्रह",
        20: "बीस", 23: "तेईस", 27: "सत्ताईस", 30: "तीस", 33: "तेंतीस", 36: "छत्तीस",
    }
    started, finished, orphan = False, False, []
    indented_opening = False

    def append(value):
        value = normalize(value)
        # Printed ornaments, page numbers and separators contain no letters.
        if any(unicodedata.category(char).startswith("L") for char in value):
            units.append((len(units) + 1, value, "prose"))

    def flush():
        nonlocal orphan, indented_opening
        if started and not finished:
            append("".join(orphan))
        orphan = []
        indented_opening = False

    def visit(node):
        nonlocal started, finished, indented_opening
        if finished:
            return
        if isinstance(node, str):
            if started:
                orphan.append(node)
            return
        if excluded(node):
            return
        if node.tag in {"h1", "h2", "h3", "center", "big"}:
            heading = normalize(text(node))
            # Scan transclusion ranges overlap adjacent chapters. Begin at the
            # actual heading and stop before the following chapter's heading.
            if heading == chapter_names[chapter]:
                flush()
                started = True
            elif started and heading:
                flush()
                finished = True
            return
        if node.tag == "p":
            # Some source headings are invalidly nested inside paragraph tags.
            if any(n.tag in {"h1", "h2", "h3", "center", "big"} for n in node.walk() if n is not node):
                for child in node.children:
                    visit(child)
                return
            # MediaWiki renders an indented first line as dd and its unindented
            # continuation as p. Reconstruct that paragraph before sampling;
            # punctuation cannot identify this boundary (a dd may end a sentence).
            opening = "".join(orphan) if indented_opening else ""
            if indented_opening:
                orphan.clear()
                indented_opening = False
            else:
                flush()
            value = normalize(text(node))
            if chapter == 1 and not started and value.startswith("होरीराम ने दोनों बैलों"):
                started = True
            if started:
                append(opening + " " + value)
            return
        if node.tag == "dd":
            flush()
            if started:
                orphan.append(text(node))
                # Each dd begins a distinct paragraph. A trailing br explicitly
                # closes the final indented paragraph before ordinary p prose.
                visible = [child for child in node.children
                           if not isinstance(child, str) or child.strip()]
                if visible and isinstance(visible[-1], Element) and visible[-1].tag == "br":
                    flush()
                else:
                    indented_opening = True
            return
        for child in node.children:
            visit(child)

    visit(container)
    flush()
    if not started:
        raise ValueError(f"Godaan chapter {chapter} opening not found")
    return units


AUDIT = False


def save_prepared(path, result, audit=False):
    if audit:
        if json.loads(path.read_text()) != result:
            raise ValueError(f"Prepared corpus differs from extraction: {path}")
    else:
        path.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write(book, snapshots, sections):
    if sum(len(s["passages"]) for s in sections) < 10:
        raise ValueError(f"Incomplete corpus: {book['id']}")
    result = {
        "schemaVersion": 1, "book": book,
        "retrievedOn": max(m["retrievedOn"] for m in snapshots.manifest.values()),
        "sections": sections,
    }
    path = ROOT / "corpus/books" / f"{book['id']}.json"
    save_prepared(path, result, AUDIT)
    print(f"{book['id']}: {len(sections)} sections, "
          f"{sum(len(s['passages']) for s in sections)} passages, "
          f"{sum(len(p['text'].encode()) for s in sections for p in s['passages'])} UTF-8 bytes")


def gutenberg_chinese_chapters(html):
    """Retain Gutenberg paragraphs and explicit verse breaks, never printed wrapping."""
    def render(node):
        if isinstance(node, str):
            return re.sub(r"\s+", "", node)
        if excluded(node):
            return ""
        if node.tag == "br":
            return "\n"
        return "".join(render(child) for child in node.children)

    chapters = []
    for node in parse(html).walk():
        if node.tag != "p":
            continue
        if any(parent.attrs.get("id") == "pg-footer" for parent in ancestors(node)):
            break
        value = unicodedata.normalize("NFC", render(node)).strip()
        if re.match(r"^第[一二三四五六七八九十百零〇○]+回", value):
            chapters.append({"anchor": node.attrs.get("id", ""), "title": value, "units": []})
        elif chapters and value != "《西遊記》至此終。" and re.search(r"[\u3400-\u9fff]", value):
            kind = "verse" if "\n" in value else "prose"
            chapters[-1]["units"].append((len(chapters[-1]["units"]) + 1, value, kind))
    return chapters


def journey(fetch=False):
    book_id = "journey-to-the-west"
    snapshots = Snapshots(book_id, fetch)
    url = "https://www.gutenberg.org/cache/epub/23962/pg23962-images.html"
    filename = "gutenberg-23962.html"
    html, _ = snapshots.get(filename, url)
    snapshots.get("gutenberg-23962-catalog.html", "https://www.gutenberg.org/ebooks/23962")
    snapshots.get("gutenberg-permission.html", "https://www.gutenberg.org/policy/permission.html")
    chapters = gutenberg_chinese_chapters(html)
    if len(chapters) != 100:
        raise ValueError(f"Expected 100 Gutenberg Chinese chapters; found {len(chapters)}")
    included = [1, 6, 11, 16, 21, 26, 31, 36, 41, 46, 51, 56, 61, 66, 71, 76, 81, 86, 91, 96, 100]
    sections = []
    for number in included:
        chapter = chapters[number - 1]
        if len(chapter["units"]) < 10 or not chapter["anchor"]:
            raise ValueError(f"Incomplete Chinese chapter {number}")
        sections.append(snapshots.section(filename, url, chapter["title"], f"chapter-{number:03}", number,
                                         sample(chapter["units"], TARGET_BYTES // len(included)),
                                         f"#{chapter['anchor']}"))
    write({
        "id": book_id, "title": "西遊記", "author": "吳承恩 (Wu Cheng’en)",
        "language": "Traditional Chinese", "locale": "zh-Hant", "direction": "ltr",
        "sourceUrl": "https://www.gutenberg.org/ebooks/23962",
        "edition": "Project Gutenberg Chinese ebook 23962, released 22 December 2007; produced by Leong Joana Kit Ieng. Gutenberg does not identify a particular underlying print edition; this is not represented as a diplomatic Ming-edition transcription.",
        "scope": "Complete source paragraphs and verse blocks sampled throughout chapters " + ", ".join(map(str, included)) + " of the 100-chapter novel; omitted chapters and units are not represented.",
        "license": "Project Gutenberg identifies this ebook's author text as public domain in the United States. Its permission policy permits reuse and claims no new copyright for formatting or spelling modernization. Attribution here is a source acknowledgement, not Gutenberg branding. Source terms: https://www.gutenberg.org/policy/license.html . This is not a worldwide rights guarantee.",
        "attribution": "吳承恩 (Wu Cheng’en), 西遊記. Project Gutenberg ebook 23962; produced by Leong Joana Kit Ieng. Source acknowledgement: https://www.gutenberg.org/ebooks/23962 . Exact downloaded text and catalog/permission evidence are hash-pinned in the acquisition ledger.",
        "editorialNote": "Replaces the mixed-edition Wikisource transcription with Gutenberg's separately identified Chinese ebook and explicit US public-domain statement. No invented print-edition provenance or reconstructed historical spelling. Source wording retained; NFC and printed line wrapping/spacing removed; explicit HTML verse breaks retained. Deterministic complete-unit samples from the same 21 chapter numbers. Gutenberg front/back matter and chapter headings are excluded from generated text.",
        "sentenceSeparator": "",
    }, snapshots, sections)


def kokoro(fetch=False):
    snapshots = Snapshots("kokoro", fetch)
    url = "https://www.aozora.gr.jp/cards/000148/files/773_14560.html"
    html, _ = snapshots.get("773_14560.html", url, "shift_jis")
    snapshots.get("card773.html", "https://www.aozora.gr.jp/cards/000148/card773.html", "auto")
    snapshots.get("handling.html", "https://www.aozora.gr.jp/guide/kijyunn.html", "auto")
    raw_sections = japanese_sections(html)
    if len(raw_sections) != 110 or len({s[0] for s in raw_sections}) != 3:
        raise ValueError("Kokoro source no longer has the expected 110 subdivisions across three parts")
    # All subdivisions contribute; short subdivisions leave room for others.
    # Find a shared whole-paragraph allowance close to the overall byte target.
    selections = []
    for allowance in range(TARGET_BYTES // len(raw_sections), 2 * TARGET_BYTES // len(raw_sections), 16):
        candidate = [sample(units, allowance) for _, _, _, units in raw_sections]
        size = sum(len(value.encode()) for units in candidate for _, value, _ in units)
        selections.append((abs(size - TARGET_BYTES), candidate))
        if size >= TARGET_BYTES:
            break
    selected_sections = min(selections, key=lambda item: item[0])[1]
    sections = []
    for index, (part, title, anchor, units) in enumerate(raw_sections, 1):
        selected = selected_sections[index - 1]
        if not selected:
            raise ValueError(f"No complete paragraph fits Kokoro subsection {anchor}")
        sections.append(snapshots.section("773_14560.html", url, f"{part} — {title}", anchor,
                                         index, selected, f"#{anchor}"))
    write({
        "id": "kokoro", "title": "こころ", "author": "夏目漱石 (Natsume Sōseki)",
        "language": "Japanese", "locale": "ja", "direction": "ltr", "sourceUrl": url,
        "edition": "Aozora Bunko card 773, 新字新仮名 (modern characters and kana); base: 集英社文庫、集英社, 1991-02-25; input copy 1995-06-14, 10th printing; proof copy 1996-06-30, 14th printing. XHTML last updated 2010-10-31.",
        "scope": "Complete paragraphs sampled throughout all 110 numbered subdivisions of all three parts (上 先生と私; 中 両親と私; 下 先生と遺書). This is a sample, not the complete novel.",
        "license": "Original work public domain. Aozora Bunko handling rules permit redistribution and adaptation of expired-copyright works: https://www.aozora.gr.jp/guide/kijyunn.html . Catalog metadata separately CC BY 4.0.",
        "attribution": "夏目漱石; Aozora Bunko. Input: j.utiyama; proofreading: 伊藤時也. Source card, XHTML, and handling rules retained as snapshots.",
        "editorialNote": "Source-provided modern spelling retained; not first-publication orthography. Ruby rt/rp readings removed, base rb characters retained. Four gaiji image occurrences decoded from their explicit JIS X 0213 coordinates using Python's euc_jis_2004 codec. Layout indentation removed and prose whitespace flattened; no inserted joining spaces. NFC. Original novel snapshot bytes are Shift_JIS, not UTF-8, and SHA-256 hashes cover those exact bytes; supporting page encodings are in corpus/provenance/kokoro.json. Publisher URL plus snapshot hash pins the source. Complete paragraph sampling per subdivision; source order preserved.",
        "sentenceSeparator": "",
    }, snapshots, sections)



def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit", action="store_true", help="Compare full cached extraction with prepared books without rewriting")
    parser.add_argument("--fetch", action="store_true", help="Acquire missing snapshots; retain existing bytes")
    parser.add_argument("--books", nargs="+", choices=BOOK_IDS, default=list(BOOK_IDS))
    args = parser.parse_args()
    global AUDIT
    AUDIT = args.audit
    if args.audit and args.fetch:
        parser.error("--audit and --fetch cannot be combined")
    for book_id, function in [("journey-to-the-west", journey), ("kokoro", kokoro)]:
        if book_id in args.books:
            function(args.fetch)
    historical_ids = {"jindallae-kkot", "godaan"}.intersection(args.books)
    if historical_ids:
        spec = importlib.util.spec_from_file_location("historical_hindi_korean", ROOT / "scripts/import-historical-hindi-korean.py")
        historical = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(historical)
        historical.run(books=sorted(historical_ids), fetch=args.fetch, check=args.audit)
    if "oedipus-tyrannus" in args.books:
        spec = importlib.util.spec_from_file_location("historical_dante_greek", ROOT / "scripts/import-historical-dante-greek.py")
        historical = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(historical)
        options = ["--book", "oedipus-tyrannus"]
        if args.audit:
            options.append("--check")
        elif not args.fetch:
            options.append("--offline")
        historical.main(options)
    delegated = [
        ("multilingual_ar_russian", {"the-broken-wings", "crime-and-punishment"}),
    ]
    for name, owned in delegated:
        selected = owned.intersection(args.books)
        if selected:
            spec = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            module.run(fetch=args.fetch, books=selected, audit=args.audit)


if __name__ == "__main__":
    main()
