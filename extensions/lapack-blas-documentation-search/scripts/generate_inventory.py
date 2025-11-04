#!/usr/bin/env python3
"""
Generate markdown documentation (when missing) and inventory metadata for LAPACK/BLAS routines.

The script reads Netlib's public documentation (Doxygen HTML) to:
1. Discover every documented routine.
2. Backfill any missing markdown files in assets/docs/.
3. Produce a complete assets/docs/inventory.json with official URLs and categories.
"""

from __future__ import annotations

import json
import re
import time
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Tuple

from bs4 import BeautifulSoup, NavigableString

BASE_URL = "https://www.netlib.org/lapack/explore-html/"
INDEX_PAGES = [
    "globals_func_c.html",
    "globals_func_d.html",
    "globals_func_s.html",
    "globals_func_z.html",
]

DOCS_DIR = Path("assets/docs")
INVENTORY_PATH = DOCS_DIR / "inventory.json"
CACHE_DIR = Path(".netlib-cache")


@dataclass
class RoutineMeta:
    name: str
    href: str
    group_path: str


def fetch(path: str) -> str:
    """Fetch a Netlib HTML page with simple file-system caching."""
    cache_path = CACHE_DIR / path.split("#", 1)[0]
    if cache_path.exists():
        return cache_path.read_text(encoding="utf-8")

    url = urllib.request.urljoin(BASE_URL, path)
    cache_path.parent.mkdir(parents=True, exist_ok=True)

    for attempt in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as resp:
                content = resp.read().decode("utf-8", errors="ignore")
                cache_path.write_text(content, encoding="utf-8")
                return content
        except (urllib.error.URLError, TimeoutError) as exc:
            if attempt == 2:
                raise RuntimeError(f"Failed to fetch {url}: {exc}") from exc
            time.sleep(1.5)
    raise RuntimeError(f"Unreachable code while fetching {url}")


def collect_routines() -> Dict[str, RoutineMeta]:
    """Parse Netlib index pages and collect routine hyperlinks."""
    routines: Dict[str, RoutineMeta] = {}
    for index_path in INDEX_PAGES:
        html = fetch(index_path)
        soup = BeautifulSoup(html, "html.parser")
        for item in soup.select("div.contents li"):
            text_nodes = [
                node.strip()
                for node in item.contents
                if isinstance(node, NavigableString)
            ]
            raw_text = "".join(text_nodes)
            match = re.match(r"([a-z0-9_]+)\(\)", raw_text or "")
            if not match:
                continue
            name = match.group(1).lower()
            link = None
            for anchor in item.select("a[href]"):
                href = anchor["href"]
                if "group__" in href:
                    link = href
                    break
            if not link:
                continue
            group_path = derive_group_path(link)
            routines.setdefault(name, RoutineMeta(name=name, href=link, group_path=group_path))
    return routines


def derive_group_path(href: str) -> str:
    """Convert routine href into the corresponding group page path."""
    path = href.split("#", 1)[0]
    directory, _, filename = path.rpartition("/")
    group_match = re.match(r"(group__.+?)_g[a-z0-9]+\.html$", filename)
    if not group_match:
        raise ValueError(f"Cannot derive group path from href: {href}")
    group_filename = f"{group_match.group(1)}.html"
    return f"{directory}/{group_filename}" if directory else group_filename


def write_markdown(routine: RoutineMeta, docs_dir: Path) -> Path:
    """Generate markdown documentation for a routine, overwriting existing content."""
    doc_path = docs_dir / f"{routine.name}.md"
    html = fetch(routine.href)
    soup = BeautifulSoup(html, "html.parser")
    markdown = render_markdown(routine.name, soup)
    doc_path.write_text(markdown, encoding="utf-8")
    return doc_path


def render_markdown(name: str, soup: BeautifulSoup) -> str:
    """Transform a routine detail page (BeautifulSoup tree) into markdown."""
    mem_proto = soup.select_one(".memproto")
    if not mem_proto:
        raise ValueError(f"Unable to locate signature for {name}")

    memname_cell = mem_proto.find("td", class_="memname")
    if not memname_cell:
        raise ValueError(f"Unable to locate memname cell for {name}")
    return_line = " ".join(memname_cell.stripped_strings).strip().lower()
    params = extract_signature_parameters(mem_proto)

    lines: List[str] = []
    lines.append("```fortran")
    lines.append(f"{return_line} (")
    if params:
        for idx, (ptype, pname) in enumerate(params):
            suffix = "," if idx < len(params) - 1 else ""
            lines.append(f"        {ptype} {pname}{suffix}")
    lines.append(")")
    lines.append("```")
    lines.append("")

    purpose_lines = extract_purpose_lines(soup)
    if purpose_lines:
        lines.extend(escape_markdown_lines(purpose_lines))
        lines.append("")

    param_docs = extract_parameter_docs(soup)
    if param_docs:
        lines.append("## Parameters")
        for entry in param_docs:
            type_part = f" : {escape_markdown_text(entry['type'])}" if entry['type'] else ""
            header = f"{entry['name']}{type_part} [{entry['direction']}]".rstrip()
            lines.append(header)
            for detail in entry["details"]:
                lines.append(f"> {escape_markdown_text(detail)}")
            lines.append("")

    return "\n".join(lines).rstrip() + "\n"


def extract_signature_parameters(mem_proto: BeautifulSoup) -> List[Tuple[str, str]]:
    """Extract parameter types and names from the memproto table."""
    params: List[Tuple[str, str]] = []
    for row in mem_proto.select("tr"):
        type_cell = row.find("td", class_="paramtype")
        name_cell = row.find("td", class_="paramname")
        if not type_cell or not name_cell:
            continue
        param_type = " ".join(type_cell.stripped_strings).lower()
        raw_name = "".join(name_cell.stripped_strings)
        cleaned = raw_name.replace(",", "").replace(")", "").strip().lower()
        if not cleaned:
            continue
        params.append((param_type, cleaned))
    return params


def extract_purpose_lines(soup: BeautifulSoup) -> List[str]:
    """Extract the routine purpose description as clean text lines."""
    section = soup.select_one(".memdoc dl.section.user pre.fragment")
    if not section:
        return []
    return clean_fragment(section.get_text("\n"))


def extract_parameter_docs(soup: BeautifulSoup) -> List[Dict[str, object]]:
    """Extract parameter documentation from the Doxygen parameter table."""
    table = soup.select_one(".memdoc dl.params table.params")
    if not table:
        return []

    param_entries: List[Dict[str, object]] = []
    for row in table.find_all("tr", recursive=False):
        dir_cell = row.find("td", class_="paramdir")
        name_cell = row.find("td", class_="paramname")
        desc_pre = row.find("pre", class_="fragment")

        if not dir_cell or not name_cell or not desc_pre:
            continue

        direction = dir_cell.get_text(strip=True).strip("[]").lower()
        name = name_cell.get_text(strip=True).upper()
        lines = clean_fragment(desc_pre.get_text("\n"))
        type_info = ""
        details = lines
        if lines:
            first_line = lines[0]
            match = re.match(rf"{re.escape(name)}\s+is\s+(.+)", first_line, re.IGNORECASE)
            if match:
                type_info = match.group(1).strip()
                details = lines[1:]
            else:
                type_info = first_line.strip()
                details = lines[1:]
        param_entries.append(
            {
                "name": name,
                "type": type_info,
                "direction": direction,
                "details": details,
            }
        )
    return param_entries


def clean_fragment(raw_text: str) -> List[str]:
    """Clean a Fortran comment fragment (Doxygen preformatted block)."""
    lines = []
    for raw_line in raw_text.splitlines():
        stripped = raw_line.strip()
        if stripped.startswith("!>"):
            stripped = stripped[2:].lstrip()
        lines.append(stripped)

    # Trim leading and trailing blank lines.
    while lines and not lines[0]:
        lines.pop(0)
    while lines and not lines[-1]:
        lines.pop()
    return lines
def escape_markdown_text(text: str) -> str:
    """Escape asterisks so markdown renders multiplication correctly."""
    if not text:
        return text
    return re.sub(r"(?<!\\)\*", r"\*", text)


def escape_markdown_lines(lines: Iterable[str]) -> List[str]:
    """Apply markdown escaping to a list of text lines."""
    return [escape_markdown_text(line) for line in lines]


def extract_summary(doc_path: Path) -> str:
    """Return the first non-empty line after the signature block."""
    lines = doc_path.read_text(encoding="utf-8").splitlines()
    in_code = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if in_code or not stripped:
            continue
        return stripped
    return ""


def fetch_group_metadata(group_path: str) -> Tuple[str, str]:
    """Fetch group page metadata: category and role."""
    html = fetch(group_path)
    soup = BeautifulSoup(html, "html.parser")
    title = soup.select_one(".headertitle .title")
    if not title:
        return "Uncategorized", "lapack:routine"

    breadcrumbs = [a.get_text(strip=True) for a in title.select(".ingroups a")]
    category = breadcrumbs[-1] if breadcrumbs else "Uncategorized"
    primary = breadcrumbs[0] if breadcrumbs else ""

    category_lower = category.lower()
    if "blas" in primary.lower():
        role = "blas:routine"
    elif "driver" in category_lower:
        role = "lapack:driver"
    elif "computational" in category_lower:
        role = "lapack:computational"
    elif "auxiliary" in category_lower or "support" in category_lower:
        role = "lapack:auxiliary"
    else:
        role = "lapack:routine"
    return category, role


def build_inventory(routines: Dict[str, RoutineMeta]) -> List[Dict[str, str]]:
    """Create the full inventory data structure."""
    group_cache: Dict[str, Tuple[str, str]] = {}
    entries: List[Dict[str, str]] = []

    for name in sorted(routines.keys()):
        doc_path = DOCS_DIR / f"{name}.md"
        if not doc_path.exists():
            # Skip routines without documentation; generation should have created them.
            continue

        meta = routines[name]
        if meta.group_path not in group_cache:
            group_cache[meta.group_path] = fetch_group_metadata(meta.group_path)
        category, role = group_cache[meta.group_path]

        description = extract_summary(doc_path)
        url = urllib.request.urljoin(BASE_URL, meta.href)

        entries.append(
            {
                "id": name,
                "name": name,
                "role": role,
                "category": category,
                "url": url,
                "docPath": doc_path.name,
                "description": description,
            }
        )

    return entries


def main() -> None:
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)

    routines = collect_routines()

    print(f"Generating markdown for {len(routines)} routines...")
    for idx, name in enumerate(sorted(routines.keys()), 1):
        meta = routines[name]
        write_markdown(meta, DOCS_DIR)
        if idx % 100 == 0 or idx == len(routines):
            print(f"  -> {idx}/{len(routines)} completed")

    inventory = build_inventory(routines)
    INVENTORY_PATH.write_text(json.dumps(inventory, indent=2), encoding="utf-8")
    print(f"Wrote inventory with {len(inventory)} entries to {INVENTORY_PATH}")


if __name__ == "__main__":
    main()
