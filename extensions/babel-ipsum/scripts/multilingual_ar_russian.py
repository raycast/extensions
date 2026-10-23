"""Rebuild Arabic/Russian corpus JSON from pinned local HTML snapshots.

Offline by default. --fetch fills missing snapshots via urllib, or Firecrawl
when FIRECRAWL_API_KEY is configured (needed for Safahat's browser challenge).
Firecrawl snapshots preserve the exact rawHtml string returned, encoded UTF-8;
they are browser/proxy HTML, not a claim of byte identity to an origin response.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parent.parent
SPEC = spec_from_file_location("existing_corpus_parser", ROOT / "scripts/extract-corpus.py")
PARSER = module_from_spec(SPEC)
SPEC.loader.exec_module(PARSER)
_spec = spec_from_file_location('multilingual_common', ROOT / 'scripts/import-multilingual.py')
COMMON = module_from_spec(_spec)
_spec.loader.exec_module(COMMON)
RU = "https://ru.wikisource.org/wiki/Преступление_и_наказание_(Достоевский)"
AR = "https://www.safahat.org/books/46094724/"
AR_TITLES = ["توطئة", "الكآبة الخرساء", "يد القضاء", "في باب الهيكل", "الشعلة البيضاء", "العاصفة", "بحيرة النار", "أمام عرش الموت", "بين عشتروت والمسيح", "التضحية", "المنقذ"]
RU_CHAPTERS = [("I", "I"), ("I", "VII"), ("II", "I"), ("II", "VII"), ("III", "I"), ("III", "VI"), ("IV", "I"), ("IV", "VI"), ("V", "I"), ("V", "V"), ("VI", "I"), ("VI", "VIII"), ("Эпилог", "I"), ("Эпилог", "II")]


def acquire(url, path, fetch):
    snapshots = COMMON.Snapshots(path.parent.name, fetch)
    if path.exists():
        raw = path.read_bytes()
        snapshots.verify(path.name, url, raw)
        return raw
    if not fetch:
        raise FileNotFoundError(f"Missing snapshot {path}; run --fetch to acquire it")
    encoded = urllib.parse.quote(url, safe=":/?=&%_()")
    key = os.environ.get("FIRECRAWL_API_KEY")
    for attempt in range(3):
        try:
            response_url = None
            if "safahat.org" in url and key:
                request = urllib.request.Request(
                    "https://api.firecrawl.dev/v2/scrape",
                    data=json.dumps({"url": url, "formats": ["rawHtml"], "onlyMainContent": False, "maxAge": 0}).encode(),
                    headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                )
                with urllib.request.urlopen(request, timeout=90) as response:
                    raw = json.load(response)["data"]["rawHtml"].encode("utf-8")
            else:
                request = urllib.request.Request(encoded, headers={"User-Agent": "BabelIpsumCorpus/1.0 (https://git.cafe/felrov/vibed-ipsum)"})
                with urllib.request.urlopen(request, timeout=60) as response:
                    raw = response.read()
                    response_url = response.url
            path.parent.mkdir(parents=True, exist_ok=True)
            raw.decode("utf-8")
            path.write_bytes(raw)
            snapshots.record(path.name, {"sourceUrl": url, "responseUrl": response_url, "encoding": "utf-8",
                "retrievedOn": COMMON.date.today().isoformat(), "sha256": hashlib.sha256(raw).hexdigest()})
            time.sleep(3)
            return raw
        except (urllib.error.URLError, TimeoutError) as error:
            if attempt == 2:
                raise
            time.sleep(15 * (attempt + 1) if getattr(error, "code", None) == 429 else 2 ** (attempt + 1))


def ancestors(node):
    while node is not None:
        yield node
        node = node.parent


def extract(raw, arabic):
    html = raw.decode("utf-8")
    parser = PARSER.StoryParser()
    parser.feed(html)
    nodes = list(parser.root.walk())
    marker = "chapterContent" if arabic else "mw-parser-output"
    containers = [n for n in nodes if marker in n.attrs.get("class", "").split()]
    if len(containers) != 1:
        raise ValueError(f"Expected one {marker} container, found {len(containers)}")
    passages = []
    for node in containers[0].walk():
        classes = node.attrs.get("class", "").split()
        arabic_block = arabic and node.tag == "div" and bool(set(classes) & {"paragraph-block", "attribution"}) and not any(child is not node and (child.tag == "p" or "paragraph-block" in child.attrs.get("class", "").split()) for child in node.walk())
        if (node.tag != "p" and not arabic_block) or any(n.excluded() for n in ancestors(node)):
            continue
        # MediaWiki verse blocks contain p elements; retain their line breaks.
        verse = any("poem" in n.attrs.get("class", "").split() for n in ancestors(node))
        text = node.text()
        if verse:
            text = "\n".join(" ".join(line.split()) for line in text.splitlines()).strip()
        else:
            text = " ".join(text.split())
        text = unicodedata.normalize("NFC", text)
        # Decorative dotted separators and the final numeric dateline are
        # typographic matter rather than prose passages.
        if text and any(character.isalpha() for character in text):
            passages.append({"position": len(passages) + 1, "text": text, "kind": "verse" if verse else "prose"})
    if not passages:
        raise ValueError("Empty chapter")
    return html, passages


def sample(passages, target):
    """Closest whole-paragraph byte size using uniformly spaced source indices."""
    def selected(count):
        indices = [round(i * (len(passages) - 1) / (count - 1)) for i in range(count)] if count > 1 else [0]
        return [passages[i] for i in indices]
    return min((selected(n) for n in range(1, len(passages) + 1)), key=lambda ps: abs(sum(len(p["text"].encode()) for p in ps) - target))


def build(book, chapters, fetch, audit=False):
    sections = []
    for position, (identifier, title, url) in enumerate(chapters, 1):
        path = ROOT / ".cache/corpus/sources" / book["id"] / f"{identifier}.html"
        raw = acquire(url, path, fetch)
        html, passages = extract(raw, book["id"] == "the-broken-wings")
        if book["id"] == "crime-and-punishment":
            revision = re.search(r'"wgRevisionId"\s*:\s*(\d+)', html)
            if not revision:
                raise ValueError(f"No revision ID in {path}")
            revision_url = f"https://ru.wikisource.org/w/index.php?oldid={revision.group(1)}"
            passages = sample(passages, 284192 / len(chapters))
        else:
            revision_url = url  # Publisher offers no stable revision endpoint; hash pins snapshot.
        sections.append({"id": identifier, "title": title, "position": position, "sourceUrl": url, "revisionUrl": revision_url, "snapshotPath": path.relative_to(ROOT).as_posix(), "snapshotSha256": hashlib.sha256(raw).hexdigest(), "passages": passages})
    output = {"schemaVersion": 1, "book": book, "retrievedOn": "2026-10-22", "sections": sections}
    path = ROOT / "corpus/books" / f"{book['id']}.json"
    COMMON.save_prepared(path, output, audit)
    print(f"{book['id']}: {len(sections)} sections, {sum(len(s['passages']) for s in sections)} passages, {sum(len(p['text'].encode()) for s in sections for p in s['passages'])} UTF-8 passage bytes")


def run(fetch=False, books=None, audit=False):
    selected = books if books is not None else {"the-broken-wings", "crime-and-punishment"}
    arabic = {"id": "the-broken-wings", "title": "الأجنحة المتكسرة", "author": "جبران خليل جبران", "language": "Arabic", "locale": "ar", "direction": "rtl", "sourceUrl": AR, "edition": "Hindawi 2012 digital edition of the 1912 Arabic novel, hosted at Safahat.", "scope": "Complete short novel: author's dedication إهداء, narrative prologue توطئة and all ten chapters. No publisher biography, descriptions, interface or assets.", "license": "Publisher states this edition's book text is public domain and legally available free of charge. The separate website footer reserves all rights to Hindawi; that is not permission for site assets or editorial material.", "attribution": "جبران خليل جبران; الأجنحة المتكسرة (1912). Hindawi Foundation 2012 edition; Safahat publisher transcription, retrieved 2026-10-22.", "editorialNote": "Arabic diacritics and punctuation retained; NFC Unicode and flattened prose whitespace only. توطئة is the author's first-person narrative opening, not a publisher foreword. Exact first-edition orthographic fidelity is unverified. UTF-8 snapshots preserve Firecrawl rawHtml strings exactly as returned, including proxy/browser markup; not claimed identical to origin wire bytes. Publisher pages have no immutable revision URLs; SHA-256 pins retrieved snapshots. Contents snapshot retained as provenance. Author's dedication and signature retained as part of the work.", "sentenceSeparator": " "}
    ar_chapters = [(identifier, title, AR + identifier + "/") for identifier, title in zip(["0.1", "0.2"] + [str(i) for i in range(1, 11)], ["إهداء"] + AR_TITLES)]
    if "the-broken-wings" in selected:
        acquire(AR, ROOT / ".cache/corpus/sources/the-broken-wings/contents.html", fetch)
        build(arabic, ar_chapters, fetch, audit)
    russian = {"id": "crime-and-punishment", "title": "Преступление и наказание", "author": "Фёдор Михайлович Достоевский", "language": "Russian", "locale": "ru", "direction": "ltr", "sourceUrl": RU, "edition": "Modern-spelling Russian Wikisource transcription, credited there to lib.ru; original novel published 1866. Exact underlying print edition unspecified; not a diplomatic pre-reform edition.", "scope": "Deterministic evenly spaced complete-paragraph samples from the first and last chapter of each of all six parts, plus both epilogue chapters: I/I,VII; II/I,VII; III/I,VI; IV/I,VI; V/I,V; VI/I,VIII; epilogue/I,II. Target approximately 284192 UTF-8 passage bytes; partial novel.", "license": "Wikisource displays a public-domain notice for the original work under Russian life-plus-70 rules, separately from the site's CC BY-SA 4.0 footer (additional terms may apply). Transcription provenance and contributors retained through pinned revision links.", "attribution": "Фёдор Михайлович Достоевский, Преступление и наказание (1866); lib.ru transcription credited by Russian Wikisource; Wikisource contributors, per-section pinned revisions, retrieved 2026-10-22. https://creativecommons.org/licenses/by-sa/4.0/", "editorialNote": "Modern spelling retained without historical reconstruction; exact print edition and normalization policy of source unverified. Source encoding UTF-8. NFC and flattened prose whitespace only; verse line breaks retained where explicitly marked. Sampling chooses uniformly spaced paragraph indices including first and last; paragraph count minimizes absolute distance from an equal per-chapter UTF-8 byte budget. Passage positions retain original extracted paragraph ordinals and may have gaps. Interface, navigation, metadata, references, headers and page numbers excluded.", "sentenceSeparator": " "}
    chapters = []
    for part, chapter in RU_CHAPTERS:
        suffix = f"/Эпилог/{chapter}" if part == "Эпилог" else f"/Часть_{part}/Глава_{chapter}"
        title = f"Эпилог. Глава {chapter}" if part == "Эпилог" else f"Часть {part}. Глава {chapter}"
        chapters.append((f"{part}-{chapter}", title, RU + suffix))
    if "crime-and-punishment" in selected:
        acquire(RU, ROOT / ".cache/corpus/sources/crime-and-punishment/contents.html", fetch)
        build(russian, chapters, fetch, audit)


if __name__ == "__main__":
    arguments = argparse.ArgumentParser(description=__doc__)
    arguments.add_argument("--fetch", action="store_true", help="Acquire missing snapshots; existing snapshots are never refreshed")
    run(fetch=arguments.parse_args().fetch)
