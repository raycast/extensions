"""Replay historical-edition corpora from pinned, exact-byte source snapshots.

Default acquires missing snapshots only. --offline never uses the network;
--check implies --offline and compares without writing any files. --book selects
one importer; add future works to IMPORTERS without coupling to shared importers.
"""

import argparse
import hashlib
import importlib.util
import json
import re
import unicodedata
import xml.etree.ElementTree as ET
from datetime import date
from pathlib import Path
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
html_spec = importlib.util.spec_from_file_location("historical_html", ROOT / "scripts/extract-corpus.py")
html_base = importlib.util.module_from_spec(html_spec)
html_spec.loader.exec_module(html_base)

USER_AGENT = "VibedIpsumCorpus/1.0 (+https://git.cafe/felrov/vibed-ipsum)"
GREEK_COMMIT = "0189b9c8d8d1f148133f2f0af309b4ee90ea4332"
GREEK_REPO = "https://raw.githubusercontent.com/PerseusDL/canonical-greekLit/" + GREEK_COMMIT
GREEK_XML = "tlg0011.tlg004.perseus-grc2.xml"
GREEK_SOURCES = {
    GREEK_XML: f"{GREEK_REPO}/data/tlg0011/tlg004/{GREEK_XML}",
    "README.md": f"{GREEK_REPO}/README.md",
    "__cts__.xml": f"{GREEK_REPO}/data/tlg0011/tlg004/__cts__.xml",
    "commit.json": "https://api.github.com/repos/PerseusDL/canonical-greekLit/commits/" + GREEK_COMMIT,
}
NS = {"t": "http://www.tei-c.org/ns/1.0"}
XML_LANG = "{http://www.w3.org/XML/1998/namespace}lang"
MAX_SOURCE_BYTES = 8_000_000


def serialized(value):
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise ValueError(f"Source redirect refused: {req.full_url} -> {newurl}")


def download(url):
    """Fetch a fixed source URL; recorded hashes govern subsequent acquisition."""
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept-Encoding": "identity"})
    with build_opener(NoRedirect()).open(request, timeout=45) as response:
        if response.geturl() != url:
            raise ValueError(f"Unexpected response URL: {response.geturl()}")
        raw = response.read(MAX_SOURCE_BYTES + 1)
    if not raw or len(raw) > MAX_SOURCE_BYTES:
        raise ValueError(f"Empty or oversized source: {url}")
    if url.endswith(".jpg"):
        if not raw.startswith(b"\xff\xd8\xff"):
            raise ValueError(f"Expected a JPEG scan: {url}")
    else:
        raw.decode("utf-8")
    return raw


class Sources:
    """Verify cached bytes, stage acquisition, then persist after extraction succeeds."""

    def __init__(self, book_id, urls, offline=False):
        if not re.fullmatch(r"[a-z0-9-]+", book_id):
            raise ValueError("Invalid book ID")
        if any(Path(name).name != name or name in {".", ".."} for name in urls):
            raise ValueError("Snapshot names must be plain filenames")
        if any(not url.startswith("https://") for url in urls.values()):
            raise ValueError("Sources must use HTTPS")
        self.directory = ROOT / ".cache/corpus/sources" / book_id
        self.path = ROOT / "corpus/provenance" / f"{book_id}.json"
        previous = json.loads(self.path.read_text()) if self.path.exists() else {}
        self.wrapped = book_id == "divina-commedia"
        if self.wrapped:
            previous = previous.get("sources", {})
        self.records = {}
        self.raw = {}
        self.pending = {}
        for name, url in urls.items():
            path = self.directory / name
            encoding = "binary/jpeg" if name.endswith(".jpg") else "utf-8"
            record = previous.get(name)
            if path.exists():
                raw = path.read_bytes()
                if not record:
                    raise ValueError(f"Snapshot provenance mismatch: {path}")
            else:
                if offline:
                    raise FileNotFoundError(f"Missing {path}; acquire without --offline first")
                raw = download(url)
                if not record:
                    record = {
                        "sourceUrl": url, "responseUrl": url, "encoding": encoding,
                        "retrievedOn": date.today().isoformat(), "sha256": sha256(raw),
                    }
                self.pending[name] = raw
            if record.get("sourceUrl") != url or record.get("responseUrl") != url or record.get("sha256") != sha256(raw):
                raise ValueError(f"Snapshot provenance mismatch: {path}")
            if record.get("encoding") != encoding:
                raise ValueError(f"Unexpected source encoding: {path}")
            if self.wrapped and record.get("snapshotSha256", record["sha256"]) != record["sha256"]:
                raise ValueError(f"Conflicting snapshot hashes: {path}")
            date.fromisoformat(record["retrievedOn"])
            if encoding == "utf-8":
                raw.decode("utf-8")
            elif not raw.startswith(b"\xff\xd8\xff"):
                raise ValueError(f"Expected a JPEG scan: {path}")
            self.raw[name] = raw
            self.records[name] = record

    def save(self):
        self.directory.mkdir(parents=True, exist_ok=True)
        for name, raw in self.pending.items():
            with (self.directory / name).open("xb") as target:
                target.write(raw)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        ledger = self.records
        if self.wrapped:
            ledger = {"schemaVersion": 1, "encoding": "UTF-8 text; JPEG scans; snapshots retain exact response bytes",
                      "sources": {name: {**record, "snapshotSha256": record["sha256"]} for name, record in self.records.items()}}
        self.path.write_text(serialized(ledger), encoding="utf-8")


def parse_tei(raw):
    # ElementTree does not fetch external entities. Reject DTDs altogether so
    # internal entity expansion and ambiguous external declarations also fail.
    if b"<!DOCTYPE" in raw.upper() or b"<!ENTITY" in raw.upper():
        raise ValueError("DTD/entity declarations are not supported")
    return ET.fromstring(raw)


def tag(node):
    return node.tag.rsplit("}", 1)[-1]


def normalize(value):
    return unicodedata.normalize("NFC", " ".join(value.split()))


def greek_line(node):
    """Render the critical text, retaining printed supplements and deletions.

    The TEI change log explicitly maps <...> to add and [...] to del. These
    are edition signs, not word-processor revision instructions. Apparatus is
    reduced to its lemma; notes, directions and empty gap/milestone tags vanish.
    No missing letters/lines are invented for gaps; their extent remains in XML.
    Unknown inline elements fail instead of silently losing or doubling words.
    """
    name = tag(node)
    if name in {"note", "stage", "speaker", "gap", "milestone", "pb", "lb"}:
        return ""
    if name == "app":
        lemmas = node.findall("t:lem", NS)
        if len(lemmas) != 1:
            raise ValueError("Apparatus must have exactly one lemma")
        return greek_line(lemmas[0])
    if name not in {"l", "add", "del", "lem", "hi", "seg", "unclear", "supplied", "sic", "corr", "foreign"}:
        raise ValueError(f"Unsupported Greek inline element: {name}")
    if node.get(XML_LANG, "grc") != "grc":
        raise ValueError("Non-Greek inline text in Greek verse")
    value = (node.text or "") + "".join(greek_line(child) + (child.tail or "") for child in node)
    if name == "add":
        return "<" + value + ">"
    if name == "del":
        return "[" + value + "]"
    return value


def greek_groups(raw):
    """One passage per TEI sp, with each l exactly once in document order."""
    root = parse_tei(raw)
    text = root.find("t:text", NS)
    if text is None or text.get(XML_LANG) != "grc":
        raise ValueError("Expected an Ancient Greek text (xml:lang=grc)")
    editions = text.findall("t:body/t:div[@type='edition']", NS)
    if len(editions) != 1 or editions[0].get("n") != "urn:cts:greekLit:tlg0011.tlg004.perseus-grc2" or editions[0].get(XML_LANG) != "grc":
        raise ValueError("Expected the Oedipus Tyrannus Greek edition")
    edition = editions[0]

    def validate_structure(node):
        name = tag(node)
        if name in {"l", "speaker", "stage", "note", "head", "milestone"}:
            return
        if name not in {"div", "sp"}:
            raise ValueError(f"Unexpected element outside Greek verse: {name}")
        if node.get(XML_LANG, "grc") != "grc":
            raise ValueError("Non-Greek speech or division")
        if (node.text or "").strip() or any((child.tail or "").strip() for child in node):
            raise ValueError("Unaccounted text outside Greek verse")
        for child in node:
            validate_structure(child)

    validate_structure(edition)
    groups, consumed = [], []
    for ordinal, speech in enumerate(edition.findall(".//t:sp", NS), 1):
        lines = speech.findall(".//t:l", NS)
        if not lines:
            raise ValueError("Speech without verse lines")
        speaker = normalize("".join(speech.find("t:speaker", NS).itertext())) if speech.find("t:speaker", NS) is not None else speech.get("n", "")
        if not speaker:
            raise ValueError("Speech without speaker attribution")
        rendered = [normalize(greek_line(line)) for line in lines]
        # An empty gap-only line contributes no invented verse, but still counts
        # in coverage. Source line numbers need not be consecutive (lyric metre).
        value = "\n".join(line for line in rendered if line)
        consumed.extend(lines)
        if not value:
            if not all(line.find("t:gap", NS) is not None for line in lines):
                raise ValueError("Speech contains no retained text")
            continue
        groups.append((ordinal, speaker, lines[0].get("n"), lines[-1].get("n"), value))
    if consumed != edition.findall(".//t:l", NS):
        raise ValueError("Verse lines dropped, duplicated, or reordered outside speech groups")
    return root, groups, consumed


def import_greek(sources):
    raw = sources.raw[GREEK_XML]
    root, groups, lines = greek_groups(raw)
    header = root.find("t:teiHeader", NS)
    if header is None:
        raise ValueError("Missing Greek edition header")
    monograph = header.find("t:fileDesc/t:sourceDesc/t:biblStruct/t:monogr", NS)
    if monograph is None:
        raise ValueError("Missing Greek print edition")

    def values(path):
        return [normalize("".join(n.itertext())) for n in monograph.findall(path, NS)]
    if (values("t:editor") != ["Francis Storr"] or values("t:imprint/t:date") != ["1912"]
            or values("t:biblScope[@unit='volume']") != ["1"]
            or values("t:imprint/t:pubPlace") != ["London", "New York"]
            or values("t:imprint/t:publisher") != ["William Heinemann Ltd.", "The Macmillan Company"]):
        raise ValueError("Unexpected Greek print edition")
    scan = "https://archive.org/details/sophoclesstor01sophuoft/page/6/mode/2up"
    if header.find(".//t:sourceDesc//t:ref", NS).get("target") != scan:
        raise ValueError("Unexpected edition scan reference")
    changes = {n.get("when"): "".join(n.itertext()) for n in header.findall("t:revisionDesc/t:change", NS)}
    if "Francis Storr" not in changes.get("2012-11-20", "") or "scanned" not in changes.get("1988", ""):
        raise ValueError("Missing historical edition attribution evidence")
    if header.findall(".//t:availability", NS) or header.findall(".//t:licence", NS):
        raise ValueError("Source-specific rights statement requires review")
    readme = sources.raw["README.md"].decode("utf-8")
    if "Unless otherwise indicated, all contents of this repository are licensed under a" not in readme or "Creative Commons Attribution-ShareAlike 4.0 International License" not in readme:
        raise ValueError("Missing repository rights evidence")
    if json.loads(sources.raw["commit.json"])["sha"] != GREEK_COMMIT:
        raise ValueError("Commit API does not match pinned revision")
    cts = parse_tei(sources.raw["__cts__.xml"])
    edition = cts.find("{http://chs.harvard.edu/xmlns/cts}edition")
    if edition is None or edition.get(XML_LANG) != "grc" or "Storr, Francis" not in "".join(edition.itertext()):
        raise ValueError("CTS edition metadata does not identify the Greek Storr edition")
    # Bounds protect against accidental excerpt/translation imports. All source
    # l nodes are separately accounted for by greek_groups, including split lines.
    if lines[0].get("n") != "1" or lines[-1].get("n") != "1530" or len(lines) != 1482 or len(groups) != 457:
        raise ValueError("Greek source is not the whole play")
    record = sources.records[GREEK_XML]
    url = record["sourceUrl"]
    metadata = {
        "id": "oedipus-tyrannus", "title": "Οἰδίπους Τύραννος", "author": "Σοφοκλῆς",
        "language": "Ancient Greek", "locale": "el", "direction": "ltr", "sourceUrl": url,
        "edition": "Sophocles, volume 1, edited by Francis Storr. London: William Heinemann Ltd.; New York: The Macmillan Company, 1912 (Loeb Classical Library). Perseus Ancient Greek TEI, perseus-grc2; header attribution corrected 20 November 2012; originally scanned at the University of Chicago in 1988. Scan: " + scan,
        "scope": f"Complete play, opening speech through closing chorus (source lines 1–1530), in {len(groups)} TEI speech/chorus groups and {len(lines)} verse-line elements. The single gap-only speech at 625a is omitted without renumbering source speech ordinals. Lyric numbering skips and shared/split line numbers are retained in the snapshot; no sampling.",
        "license": "Ancient work and identified 1912 print edition are public domain by age in the United States. PerseusDL/canonical-greekLit README licenses repository contents CC BY-SA 4.0 unless otherwise indicated; no source-specific exclusion appears in this Greek TEI header or its CTS edition metadata. README also requests that modifications be offered to Perseus. This extraction retains the edition text without transcription corrections; no independent scan collation or worldwide rights determination is claimed.",
        "attribution": "Sophocles; Francis Storr, editor, Sophocles volume 1 (1912); Perseus Project, Tufts University, and PerseusDL/canonical-greekLit contributors. Source and rights evidence pinned at commit " + GREEK_COMMIT + ". CC BY-SA 4.0: https://creativecommons.org/licenses/by-sa/4.0/ . Changes: TEI-to-plain-text extraction and NFC/whitespace normalization described below.",
        "editorialNote": "Replaces the unidentified Wikisource transcription with the identified Storr/Perseus Greek text. Every substantive TEI sp becomes one speech passage (the gap-only speech at 625a is omitted), every l is visited once in source order; chorus strophes remain source groups, including card-break continuations. Polytonic accents, historic spelling, source punctuation, and verse line boundaries retained in NFC; intra-line layout whitespace collapsed. Speaker names appear only in section titles. Header, directions, notes, milestones, and apparatus readings excluded (apparatus lemma retained). TEI add is rendered as <text> and del as [text], restoring the printed critical signs specified by the 24 December 2010 change log, rather than silently discarding bracketed words. Empty gap emits no invented text; lacuna extent remains in the retained XML. No modern spelling conversion, conjectural repair, or scan collation. Exact XML, README rights evidence, CTS edition metadata, and immutable commit API response are retained and hash-ledgered.",
        "sentenceSeparator": " ",
    }
    sections = []
    for position, speaker, first, last, value in groups:
        sections.append({
            "id": f"speech-{position:03d}", "title": f"{speaker} ({first}–{last})", "position": position,
            "sourceUrl": url, "revisionUrl": url,
            "snapshotPath": f".cache/corpus/sources/oedipus-tyrannus/{GREEK_XML}",
            "snapshotSha256": record["sha256"],
            "passages": [{"position": 1, "text": value, "kind": "speech"}],
        })
    return {"schemaVersion": 1, "book": metadata, "retrievedOn": record["retrievedOn"], "sections": sections}


# Dante's selected cantos retain the existing distributed 18/17/17 scope.
DANTE_CANTOS = {
    "Inferno": [(1,136),(3,136),(4,151),(7,130),(9,133),(11,115),(12,139),(15,124),(17,136),(19,133),(20,130),(23,148),(26,142),(27,136),(29,139),(31,145),(33,157),(34,139)],
    "Purgatorio": [(1,136),(3,145),(4,139),(6,151),(9,145),(11,142),(12,136),(14,151),(17,139),(19,145),(20,151),(22,154),(25,139),(27,142),(28,148),(30,145),(33,145)],
    "Paradiso": [(1,142),(3,130),(4,142),(6,142),(9,142),(11,139),(12,145),(14,139),(17,142),(19,148),(20,148),(22,154),(25,139),(27,148),(28,139),(30,148),(33,145)],
}


def roman(number):
    value = ""
    for size, letters in [(50,"L"),(40,"XL"),(10,"X"),(9,"IX"),(5,"V"),(4,"IV"),(1,"I")]:
        while number >= size:
            value += letters
            number -= size
    return value


def dante_sources():
    urls = {}
    for cantica, cantos in DANTE_CANTOS.items():
        for number, _ in cantos:
            urls[f"buti-{cantica.lower()}-{number}.html"] = f"https://it.wikisource.org/wiki/Commedia_(Buti)/{cantica}/Canto_{roman(number)}"
        urls[f"buti-{cantica.lower()}-edition.html"] = f"https://it.wikisource.org/wiki/Indice:Commedia_-_{cantica}_(Buti).djvu"
        urls[f"buti-{cantica.lower()}-title.html"] = f"https://it.wikisource.org/wiki/Pagina:Commedia_-_{cantica}_(Buti).djvu/3"
    urls["buti-editor.html"] = "https://it.wikisource.org/wiki/Autore:Crescentino_Giannini"
    for cantica, directory, pages in [("Inferno","3/3d",[3]), ("Purgatorio","c/c2",[3]), ("Paradiso","7/7a",[3,288,368,369,550,744,865])]:
        for page in pages:
            urls[f"buti-{cantica.lower()}-scan-{page}.jpg"] = f"https://thumb.wikimedia.org/wikipedia/commons/thumb/{directory}/Commedia_-_{cantica}_%28Buti%29.djvu/page{page}-1280px-Commedia_-_{cantica}_%28Buti%29.djvu.jpg"
    return urls


# Exact, line-specific transcription repairs verified against retained 1862
# scan images. The page is the DjVu leaf, not the printed page number.
DANTE_REPAIRS = {
    "paradiso-9": [(40, "{R+|40|1}}Questo centesimo anno ancor s'incinqua;", "Questo centesimo anno ancor s'incinqua;", 288)],
    "paradiso-12": [(104, "Unde 1’ orto catolico s’irriga,", "Unde l’ orto catolico s’irriga,", 368), (140, "E1 calavrese abate Ioacchino", "El calavrese abate Ioacchino", 369)],
    "paradiso-19": [(148, "148 Chè dal fianco dell’altre non si scosta.", "Chè dal fianco dell’altre non si scosta.", 550)],
    "paradiso-28": [(105, "Perchè ’1 primo ternaro terminonno.", "Perchè ’l primo ternaro terminonno.", 744)],
    "paradiso-33": [(59, "Che dopo ’1 sogno la passione impressa", "Che dopo ’l sogno la passione impressa", 865)],
}


def dante_html(raw):
    parser = html_base.StoryParser()
    parser.feed(raw.decode("utf-8"))
    roots = [n for n in parser.root.walk() if "mw-parser-output" in n.attrs.get("class", "").split()]
    if not roots:
        raise ValueError("Missing Dante content container")
    return parser.root, max(roots, key=lambda n: len(list(n.walk())))


def dante_visible(node):
    if isinstance(node, str):
        return node.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    if node.excluded() or node.tag == "link" or "numeroriga" in node.attrs.get("class", "").split():
        return ""
    if node.tag == "br":
        return "\n"
    return "".join(dante_visible(child) for child in node.children)


def dante_lines(raw):
    _, root = dante_html(raw)
    poems = []
    for node in root.walk():
        if "poem" not in node.attrs.get("class", "").split():
            continue
        parent = node.parent
        while parent is not None and not parent.excluded():
            parent = parent.parent
        if parent is None:
            poems.append(node)
    if not poems:
        raise ValueError("Missing Dante verse blocks")
    return [normalize(line) for poem in poems for line in dante_visible(poem).split("\n") if normalize(line)]


def dante_passages(lines):
    passages, pending = [], []
    for start in range(0, len(lines), 3):
        tercet = "\n".join(lines[start:start+3])
        pending.append(tercet)
        if re.search(r'[.!?][”’"».)]*$', tercet):
            passages.append("\n\n".join(pending))
            pending = []
    if pending:
        if not passages:
            raise ValueError("Dante canto has no terminal punctuation")
        passages[-1] += "\n\n" + "\n\n".join(pending)
    if len(passages) > 1 and "\n" not in passages[-1]:
        tail = passages.pop()
        passages[-1] += "\n\n" + tail
    return [{"position": i, "text": value, "kind": "verse"} for i, value in enumerate(passages, 1)]


def import_dante(sources):
    sections = []
    for cantica, cantos in DANTE_CANTOS.items():
        edition = sources.raw[f"buti-{cantica.lower()}-edition.html"].decode("utf-8")
        year = {"Inferno":"1858", "Purgatorio":"1860", "Paradiso":"1862"}[cantica]
        if not all(term in edition for term in [year, "Fratelli Nistri", "Crescentino", "Buti"]):
            raise ValueError(f"Missing {cantica} historical edition evidence")
        for number, expected in cantos:
            section_id = f"{cantica.lower()}-{number}"
            filename = f"buti-{section_id}.html"
            raw = sources.raw[filename]
            document, _ = dante_html(raw)
            if not any(f"Commedia_-_{cantica}_(Buti).djvu/" in n.attrs.get("href", "") for n in document.walk()):
                raise ValueError(f"Missing {section_id} scan transclusion links")
            lines = dante_lines(raw)
            if len(lines) != expected:
                raise ValueError(f"{section_id}: expected {expected} verse lines, got {len(lines)}")
            for line, before, after, _ in DANTE_REPAIRS.get(section_id, []):
                if lines[line-1] != before:
                    raise ValueError(f"{section_id}:{line}: reviewed repair no longer matches")
                lines[line-1] = after
            if any(re.search(r"[\d{}|]", line) for line in lines):
                raise ValueError(f"{section_id}: unexpected line number or template artifact")
            revisions = [n.attrs.get("href", "") for n in document.walk() if n.attrs.get("id") == "t-permalink" for n in n.walk() if n.tag == "a"]
            if len(revisions) != 1 or "oldid=" not in revisions[0]:
                raise ValueError(f"Missing {section_id} revision link")
            revision = revisions[0]
            if revision.startswith("/"):
                revision = "https://it.wikisource.org" + revision
            record = sources.records[filename]
            sections.append({
                "id": section_id, "title": f"{cantica} — Canto {roman(number)}", "position": len(sections)+1,
                "sourceUrl": record["sourceUrl"], "revisionUrl": revision,
                "snapshotPath": f".cache/corpus/sources/divina-commedia/{filename}", "snapshotSha256": record["sha256"],
                "passages": dante_passages(lines),
            })
    metadata = {
        "id": "divina-commedia", "title": "Divina Commedia", "author": "Dante Alighieri", "language": "Italian", "locale": "it", "direction": "ltr",
        "sourceUrl": "https://it.wikisource.org/wiki/Commedia_(Buti)",
        "edition": "Dante text printed in Commento di Francesco da Buti sopra la Divina Comedia di Dante Allighieri, published by Crescentino Giannini, Pisa: Fratelli Nistri. Tomo I (Inferno), 1858; Tomo II (Purgatorio), 1860; Tomo III (Paradiso), 1862. Wikisource scan-linked transcription; all three title-page scans retained and inspected.",
        "scope": "Complete canto samples distributed from first to last: 18 Inferno, 17 Purgatorio, 17 Paradiso (52 cantos total); same canto selection as before the historical-source replacement. Dante's verse only; Buti's commentary and Giannini's apparatus excluded.",
        "license": "The medieval poem and identified 1858–1862 print editions are public domain by age in the United States. Editor Crescentino Giannini died in 1912 (BnF authority cb123487715), beyond an ordinary life-plus-70 term. Wikisource source metadata states CC BY-SA 3.0 and GFDL; site footer links CC BY-SA 4.0 with possible additional conditions. Attribution and changes are retained for the digital transcription. No worldwide rights determination is claimed.",
        "attribution": "Dante Alighieri; Francesco da Buti, commentator; Crescentino Giannini, editor; Fratelli Nistri, Pisa, 1858–1862; Italian Wikisource and its contributors. Source revisions, exact HTML, edition evidence and inspected scan images are recorded in provenance. Digital transcription: https://creativecommons.org/licenses/by-sa/4.0/ (source metadata also identifies https://creativecommons.org/licenses/by-sa/3.0/). Changes: verse extraction, whitespace/NFC normalization, passage grouping and six scan-verified transcription repairs.",
        "editorialNote": "Replaces Petrocchi-based wording with the materially older Buti/Giannini readings, retaining historical spelling, capitalization, accents and punctuation without modernization. Only poem blocks are included; notes, prose commentary, headings, page and verse numbers are excluded. Printed verse lines survive page boundaries; adjacent tercets are grouped through terminal punctuation and the final singleton is joined to the preceding passage. Six exact, line-specific repairs are documented in scripts/import-historical-dante-greek.py DANTE_REPAIRS and verified against retained Paradiso scans: IX.40 broken template; XII.104 and XII.140 digit/letter confusion; XIX.148 stray line number; XXVIII.105 and XXXIII.59 digit/letter confusion. No general transcription correction or full scan collation is claimed. Paradiso's source transcription is complete but not fully proofread. The prior 1994 date did not itself establish active protection: Italian special critical-edition rights have a 20-year term, separate from any independently creative contribution. This historical replacement avoids that edition-specific uncertainty.",
        "sentenceSeparator": " ",
    }
    return {"schemaVersion":1, "book":metadata, "retrievedOn":max(r["retrievedOn"] for r in sources.records.values()), "sections":sections}


IMPORTERS = {"oedipus-tyrannus": (GREEK_SOURCES, import_greek), "divina-commedia": (dante_sources(), import_dante)}


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--book", choices=IMPORTERS, default="oedipus-tyrannus")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--check", action="store_true", help="read-only offline comparison")
    args = parser.parse_args(argv)
    urls, importer = IMPORTERS[args.book]
    sources = Sources(args.book, urls, offline=args.offline or args.check)
    prepared = importer(sources)
    path = ROOT / "corpus/books" / f"{args.book}.json"
    expected = serialized(prepared)
    if args.check:
        if path.read_text(encoding="utf-8") != expected:
            raise ValueError(f"Prepared corpus differs: {path}")
    else:
        sources.save()
        path.write_text(expected, encoding="utf-8")
    print(f"{'Checked' if args.check else 'Prepared'} {args.book}: {len(prepared['sections'])} groups")


if __name__ == "__main__":
    main()
