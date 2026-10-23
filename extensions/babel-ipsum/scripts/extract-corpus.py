"""Extract story paragraphs from the cached Wikisource HTML snapshots.

No network requests or third-party packages are required. Page furniture,
footnotes, running page numbers, and story headings are not corpus content.
"""

import hashlib
import json
import re
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOID_TAGS = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
EXCLUDED_CLASSES = {
    "noprint", "ws-noexport", "pagenum", "mw-editsection", "reference",
    "references", "reflist", "catlinks", "printfooter", "ws-metadata", "mw-empty-elt",
}
EXCLUDED_IDS = {"headertemplate", "header", "toc", "footer", "footertemplate", "catlinks", "siteSub", "contentSub"}


class Element:
    def __init__(self, tag, attrs=(), parent=None):
        self.tag = tag
        self.attrs = dict(attrs)
        self.parent = parent
        self.children = []

    def excluded(self):
        return (
            self.tag in {"script", "style", "nav", "footer", "header", "figure", "table", "sup"}
            or self.attrs.get("id") in EXCLUDED_IDS
            or bool(set(self.attrs.get("class", "").split()) & EXCLUDED_CLASSES)
        )

    def text(self):
        if self.excluded():
            return ""
        if self.tag == "br":
            return "\n"
        return "".join(child if isinstance(child, str) else child.text() for child in self.children)

    def walk(self):
        yield self
        for child in self.children:
            if isinstance(child, Element):
                yield from child.walk()


class StoryParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Element("document")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        element = Element(tag, attrs, self.stack[-1])
        self.stack[-1].children.append(element)
        if tag not in VOID_TAGS:
            self.stack.append(element)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                break

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def extract_story(story, html):
    parser = StoryParser()
    parser.feed(html)
    nodes = list(parser.root.walk())
    # Both Parsoid and classic MediaWiki snapshots identify the prose container.
    containers = [node for node in nodes if "mw-parser-output" in node.attrs.get("class", "").split()]
    if not containers:
        raise ValueError(f"{story['slug']}: no MediaWiki prose container")
    container = max(containers, key=lambda node: sum(child.tag == "p" for child in node.walk()))
    paragraphs = []
    for node in container.walk():
        if node.tag != "p":
            continue
        ancestor = node
        skip = False
        while ancestor is not None:
            if ancestor.excluded():
                skip = True
                break
            ancestor = ancestor.parent
        if skip:
            continue
        # A double HTML break is a paragraph boundary; single breaks are layout.
        for part in re.split(r"\n\s*\n", node.text()):
            text = re.sub(r"\s+", " ", part).strip().replace("\u00ad", "")
            if text:
                paragraphs.append(text)
    if len(paragraphs) < 10:
        raise ValueError(f"{story['slug']}: unexpectedly short story ({len(paragraphs)} paragraphs)")
    # Parsoid snapshots expose revision in html@about; classic pages expose oldid.
    revision = re.search(r'"wgRevisionId":(\d+)', html) or re.search(r"(?:revision/|oldid[=\"': ]+)(\d+)", html)
    if not revision:
        raise ValueError(f"{story['slug']}: missing revision provenance")
    return {
        **story,
        "revisionUrl": f"https://es.wikisource.org/w/index.php?oldid={revision.group(1)}",
        "snapshotSha256": hashlib.sha256(html.encode()).hexdigest(),
        "paragraphs": paragraphs,
    }


def main():
    stories = json.loads((ROOT / "corpus/editorial/sub-terra/stories.json").read_text())
    retrieval = json.loads((ROOT / "corpus/provenance/sub-terra.json").read_text())
    extracted = []
    for story in stories:
        html = (ROOT / f".cache/corpus/sources/sub-terra/{story['slug']}.html").read_text()
        result = extract_story(story, html)
        if result["snapshotSha256"] != retrieval["sources"][story["slug"] + ".html"]["snapshotSha256"]:
            raise ValueError(f"{story['slug']}: snapshot hash mismatch")
        extracted.append(result)
        print(f"{story['title']}: {len(result['paragraphs'])} paragraphs")
    output = {"source": "https://es.wikisource.org/wiki/Sub_terra", "retrievedOn": retrieval["retrievedOn"], "method": retrieval["method"], "stories": extracted}
    (ROOT / "corpus/editorial/sub-terra/original.json").write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n")
    words = Counter(
        word.lower()
        for story in extracted for paragraph in story["paragraphs"]
        for word in re.findall(r"[^\W\d_]+", paragraph)
    )
    (ROOT / ".cache/corpus/vocabulary.txt").write_text("\n".join(f"{word}\t{count}" for word, count in sorted(words.items())) + "\n")


if __name__ == "__main__":
    main()
