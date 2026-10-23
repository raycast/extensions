"""Replay the historical Korean selection and the explicitly unresolved Hindi source.

Default/--offline never accesses the network. --check compares prepared JSON and
the provenance ledger without writing. --fetch acquires missing snapshots only,
using a contact-bearing User-Agent, bounded retries, and exact-byte SHA-256s.
This importer owns jindallae-kkot and godaan; shared import entry points must
skip or dispatch these IDs. No runtime network dependency is introduced.
"""

import argparse
from datetime import date
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import time
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urljoin, urlsplit
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("historical_common", ROOT / "scripts/import-multilingual.py")
COMMON = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(COMMON)
BOOK_IDS = ("jindallae-kkot", "godaan")
# Contact URL derived from origin git.cafe:felrov/vibed-ipsum (not a placeholder).
USER_AGENT = "BabelIpsumHistorical/1.0 (+https://git.cafe/felrov/vibed-ipsum)"
KO_URL = "https://ko.wikisource.org/wiki/진달래꽃_(시집)"
# Explicit original columns in the retained 126-page contents traversal.
# Fail closed if the source layout changes; never fall back to the modern text.
KO_POSITIONS = (1, 4, 11, 14, 16, 31, 95, 104, 108, 110, 124)
HI_CHAPTERS = (1, 4, 7, 10, 14, 17, 20, 23, 27, 30, 33, 36)
HI_BYTES = 284192
US_TERM = "https://www.copyright.gov/title17/92chap3.html"
URAA = "https://www.copyright.gov/circs/circ38b.pdf"
INDIA_1992 = "https://www.wipo.int/wipolex/en/legislation/details/17860"
KO_SCAN_INDEX = "https://ko.wikisource.org/wiki/색인:CNTS-00067642119_(素月詩集)진달래꽃.pdf"

EVIDENCE = {
    "jindallae-kkot": {
        "historical-scan-index.html": KO_SCAN_INDEX,
        "historical-publication.html": "https://geumcheon.go.kr/portal/contents.do?key=3621",
        "historical-us-term.html": US_TERM,
        "historical-korean-term.html": "https://www.copyright.or.kr/eng/laws-and-treaties/copyright-law/chapter02/section04.do",
    },
    "godaan": {
        "historical-candidate-go-dan.html": "https://hi.wikisource.org/wiki/गो-दान",
        "historical-candidate-ia.json": "https://archive.org/metadata/GodanByPremchand",
        "historical-candidate-ia.txt": "https://archive.org/download/GodanByPremchand/Godan_by_Premchand_djvu.txt",
        "historical-candidate-ia-other.json": "https://archive.org/metadata/godan_premchand",
        "historical-collected-edition.html": "https://hi.wikisource.org/wiki/प्रेमचंद_रचनावली_६",
        "historical-india-1992.html": INDIA_1992,
        "historical-uraa.pdf": URAA,
    },
}


def save(path, value, check=False):
    if check:
        if not path.exists() or json.loads(path.read_text()) != value:
            raise ValueError(f"Prepared output differs: {path}")
    else:
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


class Snapshots:
    def __init__(self, book_id, fetch=False):
        self.book_id, self.fetch = book_id, fetch
        self.directory = ROOT / ".cache/corpus/sources" / book_id
        self.path = ROOT / "corpus/provenance" / f"{book_id}.json"
        ledger = json.loads(self.path.read_text())
        self.remediation = ledger.get("remediation")
        self.records = ({Path(r["snapshotPath"]).name: dict(r) for r in ledger["snapshots"]}
                        if "snapshots" in ledger else ledger)

    def get(self, filename, url, request_url=None):
        path = self.directory / filename
        if not path.exists():
            if not self.fetch:
                raise FileNotFoundError(f"Missing {path}; acquire with --fetch")
            # Registered missing snapshots must still reproduce their recorded hash.
            expected = self.records.get(filename)
            for attempt in range(3):
                time.sleep(0.6)
                try:
                    request = Request(quote(request_url or url, safe=":/%?=&()"),
                                      headers={"User-Agent": USER_AGENT})
                    with urlopen(request, timeout=30) as response:
                        raw, response_url = response.read(), response.url
                    break
                except (HTTPError, URLError, TimeoutError) as error:
                    if isinstance(error, HTTPError) and error.code not in {429, 500, 502, 503, 504}:
                        raise
                    if attempt == 2:
                        raise
                    time.sleep(2 ** attempt)
            metadata = {
                "sourceUrl": url, "requestUrl": request_url or url,
                "responseUrl": response_url, "encoding": "binary" if filename.endswith(".pdf") else "utf-8",
                "retrievedOn": date.today().isoformat(), "sha256": hashlib.sha256(raw).hexdigest(),
                "userAgent": USER_AGENT,
            }
            if expected:
                self.verify(filename, url, raw)
            else:
                if metadata["encoding"] != "binary":
                    raw.decode(metadata["encoding"])
                elif not raw.startswith(b"%PDF-"):
                    raise ValueError(f"Expected PDF source: {url}")
                self.records[filename] = metadata
            self.directory.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            # Preserve successful acquisitions even if a later source is unavailable.
            self.write_acquisitions()
            print(f"fetched {self.book_id}/{filename}: {len(raw)} bytes", flush=True)
        raw = path.read_bytes()
        self.verify(filename, url, raw)
        return raw

    def verify(self, filename, url, raw):
        record = self.records.get(filename)
        if (not record or record["sourceUrl"] != url or
                record.get("sha256", record.get("snapshotSha256")) != hashlib.sha256(raw).hexdigest()):
            raise ValueError(f"Snapshot provenance mismatch: {self.book_id}/{filename}")

    def ledger(self, remediation=None):
        records = []
        for filename, record in sorted(self.records.items()):
            record = dict(record)
            record["snapshotPath"] = (self.directory / filename).relative_to(ROOT).as_posix()
            records.append(record)
        value = {"schemaVersion": 1, "bookId": self.book_id,
                 "importer": "scripts/import-historical-hindi-korean.py", "snapshots": records}
        if remediation is not None:
            value["remediation"] = remediation
        return value

    def write_acquisitions(self):
        save(self.path, self.ledger(self.remediation))

    def section(self, filename, url, title, identifier, position, units):
        raw = self.get(filename, url)
        html = raw.decode("utf-8")
        revision = re.search(r'"wgRevisionId"\s*:\s*(\d+)', html) or re.search(r"/revision/(\d+)", html)
        if not revision:
            raise ValueError(f"Missing revision: {url}")
        return {
            "id": identifier, "title": title, "position": position, "sourceUrl": url,
            "revisionUrl": f"https://{urlsplit(url).netloc}/w/index.php?oldid={revision.group(1)}",
            "snapshotPath": (self.directory / filename).relative_to(ROOT).as_posix(),
            "snapshotSha256": hashlib.sha256(raw).hexdigest(),
            "passages": [{"position": p, "text": text, "kind": kind} for p, text, kind in units],
        }


def korean_original(html):
    root = COMMON.content(COMMON.parse(html))
    labels = [n for n in root.walk() if n.tag == "b" and COMMON.text(n).strip() == "원문"]
    if len(labels) != 1:
        raise ValueError("Expected exactly one explicitly labelled original Korean column")
    selected = labels[0].parent
    while selected is not root:
        if selected.tag == "td" or (selected.tag == "div" and
                "float:left" in selected.attrs.get("style", "").replace(" ", "")):
            break
        selected = selected.parent
    if selected is root:
        raise ValueError("Original Korean column boundary not found")
    poems = [n for n in selected.walk() if "poem" in COMMON.classes(n)]
    if len(poems) != 1:
        raise ValueError("Expected exactly one whole original Korean poem")

    def verse(node):
        if isinstance(node, str):
            # Physical HTML wrapping is layout; only br/p encode verse divisions.
            return re.sub(r"\s+", " ", node)
        if node.tag in {"big", "center", "script", "style", "sup"}:
            return ""
        if node.tag == "img":
            raise ValueError("Untranscribed image in historical Korean poem")
        if node.tag == "br":
            return "\n"
        return "".join(verse(c) for c in node.children) + ("\n" if node.tag == "p" else "")

    value = COMMON.normalize(verse(poems[0]), verse=True)
    value = re.sub(r"\n{3,}", "\n\n", value)
    if not value or "현대어" in value or "원문" in value:
        raise ValueError("Invalid original Korean poem")
    return value


def korean(snapshots):
    html = snapshots.get("index.html", KO_URL).decode("utf-8")
    links = []
    for node in COMMON.content(COMMON.parse(html)).walk():
        href = unquote(node.attrs.get("href", ""))
        if node.tag == "a" and href.startswith("/wiki/진달래꽃_(시집)/") and href not in [h for _, h in links]:
            links.append((COMMON.normalize(COMMON.text(node)), href))
    if len(links) != 126:
        raise ValueError(f"Expected 126 Korean contents links, got {len(links)}")
    sections = []
    for position in KO_POSITIONS:
        title, href = links[position - 1]
        url, filename = urljoin(KO_URL, href), f"{position:03}.html"
        value = korean_original(snapshots.get(filename, url).decode("utf-8"))
        sections.append(snapshots.section(filename, url, title, f"poem-{position:03}", position,
                                         [(1, value, "verse")]))
    book = {
        "id": "jindallae-kkot", "title": "진달래꽃", "author": "김소월 (김정식)",
        "language": "Korean", "locale": "ko", "direction": "ltr", "sourceUrl": KO_URL,
        "edition": "Explicit 원문 (original) columns in Korean Wikisource's collection labelled 매문사, 26 December 1925. Historical spelling transcription; not independently collated to a verified 1925 scan.",
        "scope": "Eleven complete poems with explicit historical columns, at contents positions " + ", ".join(map(str, KO_POSITIONS)) + ". The other 115 of the retained 126 contents entries are omitted because their historical text is not established; this is not the complete collection.",
        "license": "The original text published in 1925 is public domain in the US from 1 January 2021, even under a full 95-year publication term (17 USC 304–305): " + US_TERM + ". Kim Sowŏl died in 1934; the original is beyond South Korea's ordinary life-plus-70 economic term. Wikisource contributions: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/. This does not clear unidentified modern adaptations or establish worldwide clearance.",
        "attribution": "김소월; Korean Wikisource contributors. Each selected original column records its page, revision and exact HTML snapshot; both columns remain in source snapshots for audit only.",
        "editorialNote": "Only explicitly labelled 원문 columns are imported, once per poem; 현대어 columns and single unlabelled transcriptions are excluded. Historical spelling, Hanja, archaic Hangul jamo, punctuation, verse lines and stanza boundaries retained; titles and page furniture excluded. Source-supplied bracketed Hanja readings are retained as contributor transcription, not independently verified author text. HTML entities decoded, layout whitespace trimmed, NFC applied without spelling conversion. The contents page links a scan indexed as 숭문사 1951, not the 1925 first edition; that scan is not used as proof of 1925 fidelity. No OCR or invented textual repairs. Full 126-poem historical coverage remains blocked on a verified early source.",
        "sentenceSeparator": " ",
    }
    remediation = {
        "status": "partial-historical-replacement",
        "selectedSections": [f"poem-{position:03}" for position in KO_POSITIONS],
        "omittedContentsEntries": 115, "editionEvidence": [KO_URL, KO_SCAN_INDEX],
        "remainingQuestions": ["Collate the historical columns to a verified 1925 scan.",
                               "Acquire historical text for the other 115 contents entries."],
    }
    return book, sections, remediation


def hindi(snapshots):
    sections = []
    for number in HI_CHAPTERS:
        numeral = str(number).translate(str.maketrans("0123456789", "०१२३४५६७८९"))
        url = f"https://hi.wikisource.org/wiki/प्रेमचंद_रचनावली_६/गोदान-{numeral}"
        filename = f"chapter-{number:02}.html"
        units = COMMON.hindi_units(snapshots.get(filename, url).decode("utf-8"), number)
        if len(units) < 10:
            raise ValueError(f"Incomplete Hindi chapter {number}")
        sections.append(snapshots.section(filename, url, f"गोदान — {numeral}", f"chapter-{number:02}",
                                         number, COMMON.sample(units, HI_BYTES // len(HI_CHAPTERS))))
    book = {
        "id": "godaan", "title": "गोदान", "author": "प्रेमचंद (Premchand)",
        "language": "Hindi", "locale": "hi", "direction": "ltr",
        "sourceUrl": "https://hi.wikisource.org/wiki/प्रेमचंद_रचनावली_६/गोदान-१",
        "edition": "Unresolved collected-edition transcription under प्रेमचंद रचनावली ६; retained pending a verifiable early edition. A reproduced 1936 title page does not make this modern collection the 1936 edition.",
        "scope": "Complete novel paragraphs sampled from chapters " + ", ".join(map(str, HI_CHAPTERS)) + " across all 36 chapters. Other chapters and unselected paragraphs are omitted.",
        "license": "Rights remediation remains incomplete. For the original lifetime-published novel, Premchand's 1936 death implies expiry in India at the end of 1986 under the earlier life-plus-50 term. The 1992 amendment extended 50 to 60 years effective 28 December 1991 but section 3 did not revive expired rights: " + INDIA_1992 + ". On those facts the original fails the source-country protection condition for US URAA restoration on 1 January 1996: " + URAA + ". Non-restoration does not establish absence of independently maintained US copyright; original publication, notice and renewal history remain unverified. Neither automatic 1936-plus-95 protection nor blanket worldwide public-domain status is asserted. Hindi Wikisource contributor text: CC BY-SA 4.0, https://creativecommons.org/licenses/by-sa/4.0/; this does not prove permission for upstream modern editorial contributions.",
        "attribution": "प्रेमचंद and Hindi Wikisource contributors; source and revision links retained per chapter. Source snapshots retain the site's notices. No edition-specific permission has been established for the modern collected text.",
        "editorialNote": "Existing paragraph text and sampling retained while historical replacement is blocked. Supplied spelling, danda, nukta and apparent transcription errors retained, NFC and prose layout whitespace flattened. Running page markers, title pages, chapter headings and ornaments excluded; dd openings joined to p continuations before complete-paragraph sampling. No first-edition fidelity or independent scan collation is claimed. Candidate गो-दान explicitly says current edition 1961 (Saraswati Press, Allahabad), alongside first edition 1936; rejected as proof of a 1936 scan. Archive metadata alone also does not verify a 1936 imprint. US formalities and the modern edition rights chain remain unresolved even if a historical printing is later acquired.",
        "sentenceSeparator": " ",
    }
    remediation = {
        "status": "blocked-historical-replacement-existing-text-retained",
        "editionEvidence": list(EVIDENCE["godaan"].values()),
        "rejectedCandidates": [
            {"url": "https://hi.wikisource.org/wiki/गो-दान", "reason": "Colophon: © सरस्वती प्रेस इलाहाबाद; प्रथम संस्करण १९३६, वर्तमान संस्करण १९६१; Allahabad Law Journal Press. A 1961 edition, not a verified 1936 printing."},
            {"url": "https://archive.org/details/GodanByPremchand", "reason": "Uploader metadata dates the work 1936, but the downloaded text opens with HindiKosh and a Unicode-edition credit to Sanjay Khatri. This is a digital retype, not verified evidence of a named 1936 printing; no upstream early imprint was established."},
            {"url": "https://archive.org/details/godan_premchand", "reason": "Uploader date 1936 and Public Domain Mark do not establish a named early edition or a US formalities history."},
        ],
        "remainingQuestions": ["Locate and verify an actual early edition's title page and colophon.",
                               "Establish US publication/formality/renewal history separately from URAA non-restoration.",
                               "Identify permission or expiry for any retained modern editorial contributions."],
    }
    return book, sections, remediation


def run(books=BOOK_IDS, fetch=False, check=False):
    for book_id in books:
        snapshots = Snapshots(book_id, fetch)
        for filename, url in EVIDENCE[book_id].items():
            snapshots.get(filename, url)
        book, sections, remediation = (korean if book_id == "jindallae-kkot" else hindi)(snapshots)
        # Evidence retrieval dates do not pretend that the passage text was re-fetched.
        dates = [snapshots.records[Path(s["snapshotPath"]).name]["retrievedOn"] for s in sections]
        output = {"schemaVersion": 1, "book": book, "retrievedOn": max(dates), "sections": sections}
        save(ROOT / "corpus/books" / f"{book_id}.json", output, check)
        save(snapshots.path, snapshots.ledger(remediation), check)
        texts = [p["text"] for s in sections for p in s["passages"]]
        print(f"{book_id}: {len(sections)} sections, {len(texts)} passages, "
              f"{sum(len(t.encode('utf-8')) for t in texts)} UTF-8 text bytes; {remediation['status']}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--offline", action="store_true")
    mode.add_argument("--fetch", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--books", nargs="+", choices=BOOK_IDS, default=BOOK_IDS)
    args = parser.parse_args()
    if args.check and args.fetch:
        parser.error("--fetch and --check cannot be combined")
    run(args.books, args.fetch, args.check)


if __name__ == "__main__":
    main()
