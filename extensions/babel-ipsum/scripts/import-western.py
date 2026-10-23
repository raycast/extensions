"""Acquire and extract seven public-domain Western works (stdlib only).

HTML responses are cached byte-for-byte under .cache/corpus/sources; all
currently used responses are UTF-8. Acquisition records live in corpus/provenance.
Default reuses snapshots; --offline forbids networking; --check verifies output
without writing it. --refresh refetches sources. Runtime sampling is separate.
"""
import argparse
import datetime
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("story_extractor", ROOT / "scripts/extract-corpus.py")
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def roman(number):
    result = ""
    for value, letters in [(50,"L"),(40,"XL"),(10,"X"),(9,"IX"),(5,"V"),(4,"IV"),(1,"I")]:
        while number >= value:
            result += letters
            number -= value
    return result


def wiki(lang, page):
    return f"https://{lang}.wikisource.org/wiki/{page}"


def plans():
    stories = ["La tortuga gigante", "Las medias de los flamencos", "El loro pelado", "La guerra de los yacarés", "La gama ciega", "Historia de dos cachorros de coatí y de dos cachorros de hombre", "El paso del Yabebirí", "La abeja haragana"]
    result = {
        "de-finibus": [("liber-i", "Liber I", wiki("la", "De_finibus_bonorum_et_malorum/Liber_I"))],
        "cuentos-de-la-selva": [(f"story-{i}", title, wiki("es", title.replace(" ", "_"))) for i,title in enumerate(stories,1)],
        "o-alienista": [(f"chapter-{i}", f"Capítulo {roman(i)}", wiki("pt", f"O_Alienista/{roman(i)}")) for i in range(1,14)],
        "macbeth": [(f"act-{i}", f"Act {roman(i)}", wiki("en", f"Macbeth_(1918)_Yale/Text/Act_{roman(i)}")) for i in range(1,6)],
        "die-verwandlung": [("complete", "Die Verwandlung", wiki("de", "Die_Verwandlung_(Franz_Kafka)"))],
    }
    # Complete chapters distributed from first through last in every Fantine book.
    counts = [14,13,9,3,13,2,11,5]
    result["les-miserables-fantine"] = [(f"book-{b}-chapter-{c}", f"Fantine — Livre {b}, chapitre {c}", wiki("fr", f"Les_Misérables/Tome_1/Livre_{b}/{c:02}")) for b,n in enumerate(counts,1) for c in sorted({1,1+(n-1)//3,1+2*(n-1)//3,n})]
    return result


def acquire(book, section, url, args):
    path = ROOT / ".cache/corpus/sources" / book / f"{section}.html"
    fetched = False
    if args.refresh or not path.exists():
        if args.offline:
            raise ValueError(f"Missing offline snapshot: {path}")
        encoded = urllib.parse.quote(url, safe=":/?=&%")
        for attempt in range(4):
            try:
                request = urllib.request.Request(encoded, headers={"User-Agent":"BabelIpsumCorpus/1.0 (https://git.cafe/felrov/vibed-ipsum)", "Accept":"text/html"})
                with urllib.request.urlopen(request, timeout=50) as response:
                    data = response.read()
                    if response.headers.get_content_charset("utf-8").lower() not in {"utf-8","utf8"}:
                        raise ValueError(f"Unexpected non-UTF8 response: {url}")
                data.decode("utf-8")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(data)
                fetched = True
                time.sleep(.15)
                break
            except (urllib.error.URLError, TimeoutError) as error:
                if isinstance(error, urllib.error.HTTPError) and error.code not in {429,500,502,503,504}:
                    raise
                if attempt == 3:
                    raise
                delay = min(30, 2 ** (attempt+1))
                if isinstance(error, urllib.error.HTTPError):
                    delay = min(60, max(delay, int(error.headers.get("Retry-After", "0")) if error.headers.get("Retry-After", "0").isdigit() else delay))
                time.sleep(delay)
    data = path.read_bytes()
    ledger_path = ROOT / "corpus/provenance" / f"{book}.json"
    ledger = json.loads(ledger_path.read_text()) if ledger_path.exists() else {"schemaVersion":1,"encoding":"UTF-8; snapshots retain exact response bytes","sources":{}}
    previous = ledger["sources"].get(path.name)
    digest = hashlib.sha256(data).hexdigest()
    if previous and not fetched and previous["snapshotSha256"] != digest:
        raise ValueError(f"Snapshot differs from acquisition ledger: {path}")
    if fetched or not previous:
        if args.check:
            raise ValueError(f"Missing acquisition record: {path}")
        # First ledger creation records the local acquisition file's date; later
        # offline checkouts always use the persisted record, never git mtimes.
        date = datetime.datetime.now().date() if fetched else datetime.datetime.fromtimestamp(path.stat().st_mtime).date()
        ledger["sources"][path.name] = {"sourceUrl":url,"retrievedOn":date.isoformat(),"snapshotSha256":digest}
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_text(json.dumps(ledger,ensure_ascii=False,indent=2)+"\n")
    return path, data


def parse(data):
    parser = base.StoryParser()
    parser.feed(data.decode("utf-8"))
    containers = [n for n in parser.root.walk() if "mw-parser-output" in classes(n)]
    if not containers:
        if any(n.attrs.get("id") == "O_ALIENISTA" for n in parser.root.walk()):
            return parser.root
        raise ValueError("No MediaWiki content container")
    return max(containers, key=lambda n: len(list(n.walk())))


def classes(node):
    return set(node.attrs.get("class", "").split())


EXCLUDE = base.EXCLUDED_CLASSES | {"numeroriga", "wst-pline", "PageNumber", "metadata", "mw-cite-backlink", "licensetpl", "ws-license", "printonly", "noprint", "ws-summary", "header_notessearchaux", "headerContainer", "ws-export", "fnanchor", "footnote"}


def excluded(node):
    return (node.tag in {"script","style","nav","footer","header","figure","table","sup","link"}
        or node.attrs.get("id") in base.EXCLUDED_IDS | {"navigationHeader","navigationNotes","ws-data","subheader","textdaten","Vorlage_Textdaten"}
        or bool(classes(node) & EXCLUDE)
        or "display:none" in node.attrs.get("style", "").replace(" ", ""))


def visible(node):
    if isinstance(node,str):
        return node.replace("\n", " ").replace("\r", " ").replace("\t", " ")
    if excluded(node):
        return ""
    if node.tag == "br":
        return "\n"
    if node.tag == "img":
        # Quiroga's printed initial is an image with an explicit single-letter alt.
        return node.attrs.get("alt", "") if len(node.attrs.get("alt", "")) == 1 else ""
    if "plainlinks" in classes(node) and node.attrs.get("id", "").isdigit():
        return ""
    return "".join(visible(c) for c in node.children)


def allowed(node):
    while node:
        if excluded(node):
            return False
        node = node.parent
    return True


def clean(text):
    return unicodedata.normalize("NFC", re.sub(r"\s+", " ", text).strip().replace("\u00ad", ""))


def extract_prose(root, book):
    units = []

    def emit(text, kind="prose", continuation=False):
        text = ("\n".join(clean(line) for line in text.split("\n") if clean(line))
                if kind == "verse" else clean(text))
        if not text or not re.search(r"[^\W\d_]", text):
            return
        if book == "de-finibus" and (text.startswith("editio:") or text.startswith("fons:")):
            return
        # Latin display quotations interrupt a paragraph; zero-indent divs
        # resume it. Keep that complete unit together, including verse lines.
        if book == "de-finibus" and units and (kind == "verse" or continuation):
            previous, previous_kind = units.pop()
            combined_kind = "verse" if kind == "verse" or previous_kind == "verse" else "prose"
            units.append((previous + ("\n" if combined_kind == "verse" else " ") + text, combined_kind))
        else:
            units.append((text, kind))

    def inline(node):
        pending = []

        def flush():
            emit("".join(pending))
            pending.clear()

        def visit(child):
            if isinstance(child, str):
                pending.append(visible(child))
            elif excluded(child):
                return
            elif "poem" in classes(child):
                flush()
                emit(visible(child), "verse")
            elif child.tag == "br":
                pending.append("\n")
            elif child.tag == "img" or ("plainlinks" in classes(child) and child.attrs.get("id", "").isdigit()):
                pending.append(visible(child))
            else:
                for nested in child.children:
                    visit(nested)

        for child in node.children:
            visit(child)
        flush()

    def walk(node):
        # Some Latin quotations use a presentation table. Permit only this
        # explicit layout shape, retaining normal table/furniture exclusions.
        layout_table = (book == "de-finibus" and node.tag == "table"
                        and "display:table" in node.attrs.get("style", "").replace(" ", "")
                        and any("poem" in classes(n) for n in node.walk()))
        if excluded(node) and not (layout_table and not classes(node) & EXCLUDE):
            return
        if node.tag == "center" or "wst-center" in classes(node):
            return
        if "poem" in classes(node):
            emit(visible(node), "verse")
            return
        if book == "de-finibus" and node.tag == "dd" and not any(n.tag == "dd" for n in node.walk() if n is not node):
            emit(visible(node), "verse")
            return
        if book == "de-finibus" and node.tag == "div" and "text-indent:0em" in node.attrs.get("style", "").replace(" ", ""):
            emit(visible(node), continuation=True)
            return
        if node.tag == "p":
            inline(node)
            return
        for child in node.children:
            if not isinstance(child, str):
                walk(child)

    walk(root)
    return units



def extract_kafka(root):
    sections = [[],[],[]]
    current = -1
    for node in root.walk():
        if node.tag == "div" and "text-align:center" in node.attrs.get("style","").replace(" ",""):
            heading = clean(visible(node))
            if heading in {"I.","II.","III."}:
                current = ["I.","II.","III."].index(heading)
        if node.tag == "p" and allowed(node) and current >= 0:
            text = clean(visible(node))
            if text and text not in {"I.","II.","III."}:
                sections[current].append((text,"prose"))
    if any(len(s)<10 for s in sections):
        raise ValueError("Missing Kafka section")
    return sections


def extract_alienista(root):
    result = [[] for _ in range(13)]
    active = False
    chapter = -1
    for node in root.walk():
        if node.tag == "h4":
            active = clean(visible(node)) == "O ALIENISTA"
        if active and node.tag == "h5" and clean(visible(node)) in {roman(i) for i in range(1,14)}:
            chapter = [roman(i) for i in range(1,14)].index(clean(visible(node)))
        if active and chapter >= 0 and node.tag == "p" and allowed(node):
            text = clean(visible(node))
            if text:
                result[chapter].append((text,"prose"))
    if any(len(s)<5 for s in result):
        raise ValueError("Missing O Alienista chapter")
    return result


SPEAKERS = {"First Witch","Sec. Witch","Third Witch","All","Dun","Mal","Serg","Len","Ross","Ang","Macb","Ban","Lady M","Mess","Fle","Port","Porter","Macd","Don","Old Man","First Mur","Sec. Mur","Third Mur","Murderers","Atten","Hec","Lords","First App","Sec. App","Third App","L. Macd","Son","Doct","Gent","Ment","Caith","Serv","Sey","Men","Siw","Sold","Young Siw","First","Sec","Third","Mur","Lord","Ban within"}


def dramatic_text(node):
    if isinstance(node,str):
        return visible(node)
    if node.tag == "i":
        return "\x01"  # directions: strip surrounding brackets and punctuation too
    return "" if excluded(node) else ("\n" if node.tag == "br" else "".join(dramatic_text(c) for c in node.children))


def dramatic_lines(node):
    # Direction-only printed lines may include a plain-text song title between
    # italic instructions. Identify their leading instruction before stripping
    # italics, so the rest of the direction cannot leak into dialogue.
    lines = [[]]

    def visit(child):
        if not isinstance(child, str) and excluded(child):
            return
        if not isinstance(child, str) and child.tag == "br":
            lines.append([])
        elif isinstance(child, str) or child.tag == "i":
            lines[-1].append(child)
        else:
            for nested in child.children:
                visit(nested)

    visit(node)
    result = []
    for line in lines:
        first = next((part for part in line if clean(visible(part))), None)
        instructions = [i for i, part in enumerate(line)
                        if not isinstance(part, str) and part.tag == "i"]
        # A leading inline instruction can precede real speech (the Porter's
        # knocking). Only treat mixed plain text as a whole direction when
        # italic instructions enclose it and no dialogue follows the last one.
        if (first is not None and not isinstance(first, str) and first.tag == "i"
                and clean(visible(first)).rstrip(".") not in SPEAKERS
                and len(instructions) >= 2
                and not re.search(r"\w", "".join(visible(part) for part in line[instructions[-1]+1:]))):
            continue
        result.append("".join(dramatic_text(part) for part in line))
    return "\n".join(result)


def flatten_printed_prose(text):
    # Reviewed print-wrap splits in the Yale text. Retain the compound devil-porter.
    for left,right in [("fur","ther"),("prim","rose"),("espe","cially"),("unpro","vokes"),("dis","heartens"),("after","wards"),("perform","ances"),("remem","brance")]:
        text = text.replace(left+"-\n"+right,left+right)
    text = text.replace("devil-\nporter","devil-porter")
    return clean(text)


def extract_macbeth(root, act):
    units = []
    scene = 0
    prose = False
    for node in root.walk():
        if node.tag == "p" and clean(visible(node)).startswith("Scene ") and any("wst-center" in classes(a) for a in ancestors(node)):
            name = clean(visible(node))
            scene = {"One":1,"Two":2,"Three":3,"Four":4,"Five":5,"Six":6,"Seven":7}.get(name.removeprefix("Scene "),0)
            prose = act == 5 and scene == 1
        if node.tag != "p" or not allowed(node) or not any("wst-dent" in classes(a) for a in ancestors(node)):
            continue
        if any(classes(a) & {"wst-right","wst-center","wst-hanging-indent"} for a in ancestors(node)):
            continue
        italics = [n for n in node.walk() if n.tag == "i"]
        label = []
        for italic in italics:
            value = clean(visible(italic)).rstrip(".")
            if value in SPEAKERS:
                label.append(italic)
                # A murderer label can use two italic elements (First / Mur).
                if value not in {"First","Sec","Third"}:
                    break
            else:
                break
        starts = bool(label)
        text = dramatic_lines(node)
        if starts:
            for _ in label:
                text = re.sub(r"^\s*\x01\s*\.?", "", text, count=1)
        text = re.sub(r"\[[^\[\]]*\x01[^\[\]]*\]", "", text)
        text = re.sub(r"\x01\s*\.?", "", text)
        text = re.sub(r"\[\s*\]", "", text)
        lines = [clean(line).replace("\u200b","") for line in text.split("\n")]
        text = "\n".join(line for line in lines if re.search(r"\w",line))
        if not text:
            continue
        speaker = clean(visible(label[0])).rstrip(".") if starts else ""
        if act == 2 and scene == 3:
            if speaker == "Porter":
                prose = True
            if speaker == "Len":
                prose = False
        if act == 4 and scene == 2:
            if text.startswith("Was my father a traitor, mother?"):
                prose = True
            if speaker == "Mess":
                prose = False
        if act == 1 and scene == 5 and text.startswith("'They met me"):
            letter,verse = text.split("\nGlamis thou art",1)
            text = flatten_printed_prose(letter)+"\nGlamis thou art"+verse
        elif prose or "\n" not in text:
            text = flatten_printed_prose(text)
        if starts:
            units.append((text,"speech"))
        elif units:
            # Source page boundaries occasionally split a speaker's paragraph.
            old,_ = units.pop()
            units.append((old+("\n" if "\n" in old or "\n" in text else " ")+text,"speech"))
    if len(units)<40:
        raise ValueError(f"Unexpectedly few Macbeth speeches: {len(units)}")
    return units


def ancestors(node):
    while node.parent:
        node = node.parent
        yield node


def revision_url(url, data):
    html = data.decode("utf-8")
    match = re.search(r'"wgRevisionId"\s*:\s*(\d+)', html) or re.search(r'(?:revision/|revision id )(\d+)',html)
    if not match:
        raise ValueError(f"Missing revision: {url}")
    return url.split("/wiki/")[0] + "/w/index.php?oldid=" + match.group(1)


META = {
    "de-finibus": ("De finibus bonorum et malorum — Liber I", "Marcus Tullius Cicero", "la", "De_finibus_bonorum_et_malorum/Liber_I", "Hugo Holstein, Leipzig: B. G. Teubner, 1873 (Wikisource transcription)", "Complete Book I.", "Section numbers and navigation omitted; editorial brackets and source spelling retained."),
    "cuentos-de-la-selva": ("Cuentos de la selva", "Horacio Quiroga", "es", "Cuentos_de_la_selva", "Buenos Aires: Cooperativa Editorial Limitada / Agencia General de Librería y Publicaciones; Imprenta Mercatali, 1918; Wikisource scan transcription", "All eight stories.", "Decorative initial letters recovered from image alt text. Historical spelling retained; page numbers and illustrations omitted. Apparent source readings including una venado and contáudoles are retained without conjectural correction."),
    "o-alienista": ("O Alienista", "Machado de Assis", "pt", "O_Alienista", "Rio de Janeiro: Lombaerts & C., 1882; Project Gutenberg ebook 57001 (2018 transcription)", "All thirteen chapters.", "The requested Wikisource chapters mix historical and modernized spelling; the complete 1882 Project Gutenberg transcription is used instead. Its readings, including apparent transcription errors such as ltaguahy and preoecupação, are retained without conjectural correction. No modernization or Sub terra corrections applied. Publisher URL and SHA-256 identify the exact UTF-8 snapshot; no publisher revision ID is asserted."),
    "macbeth": ("Macbeth", "William Shakespeare", "en", "Macbeth_(1918)_Yale", "The Yale Shakespeare: Macbeth, edited by Charlton M. Lewis, Yale University Press, 1918", "Dramatic dialogue from all five acts, excluding editorial apparatus and stage directions.", "Speaker labels, stage directions, line/page numbers, gloss metadata and footnotes omitted. Verse line breaks retained; prose layout wrapping flattened in the letter, porter exchanges, the latter mother/son dialogue in IV.ii and V.i. Reviewed printed word splits are rejoined; the compound devil-porter retains its hyphen."),
    "les-miserables-fantine": ("Les Misérables — Fantine", "Victor Hugo", "fr", "Les_Misérables", "Paris: Émile Testard, 1890, tome I; Wikisource scan transcription", "Complete chapter samples from the beginning, middle and end of all eight books of Fantine only; sampled chapter list recorded in sections.", "Source spelling and punctuation retained. Abbreviation tooltip titles are not expanded. Navigation, headings, illustrations and notes omitted."),
    "die-verwandlung": ("Die Verwandlung", "Franz Kafka", "de", "Die_Verwandlung_(Franz_Kafka)", "Die Weißen Blätter, 2. Jahrgang, Heft 10, Leipzig: Verlag der Weißen Bücher, October 1915; Wikisource transcription", "Complete story, all three numbered sections.", "Original source spelling retained; page numbers, metadata and section headings omitted; prose page wraps flattened."),
}


BOOK_IDS = (*META, "divina-commedia")


def make_book(book, args):
    if book == "divina-commedia":
        spec = importlib.util.spec_from_file_location("historical_dante_greek", ROOT / "scripts/import-historical-dante-greek.py")
        historical = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(historical)
        options = ["--book", book]
        if args.check:
            options.append("--check")
        elif args.offline:
            options.append("--offline")
        historical.main(options)
        return
    title,author,lang,page,edition,scope,note = META[book]
    sections = []
    shared = None
    if book == "o-alienista":
        # Retain the requested, mixed-orthography inputs as evidence for the
        # source substitution. These snapshots never contribute passage text.
        for requested_slug,_,requested_url in plans()[book]:
            acquire(book,requested_slug,requested_url,args)
        publisher = "https://www.gutenberg.org/files/57001/57001-h/57001-h.htm"
        shared = acquire(book,"papeis-avulsos-1882-gutenberg",publisher,args)
        chapters = extract_alienista(parse(shared[1]))
    for slug,section_title,url in plans()[book]:
        path,data = shared or acquire(book,slug,url,args)
        if shared:
            url = publisher + "#" + roman(len(sections)+1)
        if args.fetch_only:
            print(f"fetched {book}/{slug}", flush=True)
            continue
        root = parse(data)
        if book == "o-alienista":
            groups = [(slug,section_title,chapters[len(sections)])]
        elif book == "die-verwandlung":
            groups = [(f"section-{i}",f"{roman(i)}.",units) for i,units in enumerate(extract_kafka(root),1)]
        else:
            units = extract_macbeth(root,int(slug.split("-")[-1])) if book == "macbeth" else extract_prose(root,book)
            groups = [(slug,section_title,units)]
        for section_id,label,units in groups:
            if not units:
                raise ValueError(f"Empty section: {book}/{section_id}")
            sections.append({"id":section_id,"title":label,"position":len(sections)+1,"sourceUrl":url,"revisionUrl":url if shared else revision_url(url,data),"snapshotPath":str(path.relative_to(ROOT)),"snapshotSha256":hashlib.sha256(data).hexdigest(),"passages":[{"position":i,"text":t,"kind":k} for i,(t,k) in enumerate(units,1)]})
    if args.fetch_only:
        return
    ledger = json.loads((ROOT / "corpus/provenance" / f"{book}.json").read_text())
    retrieved_on = max(ledger["sources"][Path(s["snapshotPath"]).name]["retrievedOn"] for s in sections)
    result = {"schemaVersion":1,"book":{"id":book,"title":title,"author":author,"language":lang,"locale":lang,"direction":"ltr","sourceUrl":wiki(lang,page),"edition":edition,"scope":scope,"license":"Public-domain original text; Wikisource transcription contributions reused under Creative Commons Attribution-ShareAlike 4.0, as linked by each retained source-page footer (https://creativecommons.org/licenses/by-sa/4.0/). Additional terms may apply as stated in the source notices.","attribution":f"{author}, {title}. {edition}. Source: Wikisource and its contributors; revision and snapshot provenance recorded per section.","editorialNote":note,"sentenceSeparator":" "},"retrievedOn":retrieved_on,"sections":sections}
    result["book"]["language"] = {"la":"Latin","es":"Spanish","pt":"Portuguese","en":"English","fr":"French","it":"Italian","de":"German"}[lang]
    if shared:
        result["book"]["sourceUrl"] = publisher + "#O_ALIENISTA"
        result["book"]["license"] = "Public-domain original text. Project Gutenberg ebook 57001; reuse terms: https://www.gutenberg.org/policy/license.html"
        result["book"]["attribution"] = "Machado de Assis, O Alienista, in Papeis Avulsos (Rio de Janeiro: Lombaerts & C., 1882). Project Gutenberg ebook 57001; produced by Laura Natal Rodrigues and Marc D'Hooghe, using page images from the Biblioteca Brasiliana Guita e José Mindlin, Universidade de São Paulo."
    output = json.dumps(result,ensure_ascii=False,indent=2)+"\n"
    dest = ROOT / "corpus/books" / f"{book}.json"
    if args.check:
        if not dest.exists() or dest.read_text() != output:
            raise ValueError(f"Stale corpus: {dest}")
    else:
        dest.write_text(output)
    passages = [p for s in sections for p in s["passages"]]
    print(f"{book}: {len(sections)} sections, {len(passages)} passages, {sum(len(p['text'].encode()) for p in passages)} UTF8 bytes",flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--book", choices=BOOK_IDS, action="append")
    parser.add_argument("--offline", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--refresh", action="store_true")
    parser.add_argument("--fetch-only", action="store_true")
    args = parser.parse_args()
    if args.offline and args.refresh:
        parser.error("--offline and --refresh are incompatible")
    if args.check and args.refresh:
        parser.error("--check and --refresh are incompatible")
    if args.check:
        args.offline = True
    for book in args.book or BOOK_IDS:
        make_book(book,args)


if __name__ == "__main__":
    main()
