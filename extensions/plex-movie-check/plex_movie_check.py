#!/usr/bin/env python3
"""Check whether a movie exists in a Plex library via Plex API.

Usage:
  python plex_movie_check.py \
    --base-url http://127.0.0.1:32400 \
    --token YOUR_PLEX_TOKEN \
    --title "Inception" \
    --year 2010

By default, title matching is substring-based (e.g. "Incep" matches "Inception").
Use --exact-title to enforce exact normalized title matching.
You can also pass the token with the PLEX_TOKEN environment variable.
"""

from __future__ import annotations

import argparse
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from typing import Iterable


@dataclass
class MovieResult:
    section_key: str
    section_title: str
    rating_key: str
    title: str
    year: str | None


def normalize_title(text: str) -> str:
    return "".join(ch for ch in text.casefold() if ch.isalnum())


def build_url(base_url: str, path: str, token: str, query: dict[str, str] | None = None) -> str:
    base = base_url.rstrip("/")
    q = dict(query or {})
    q["X-Plex-Token"] = token
    return f"{base}{path}?{urllib.parse.urlencode(q)}"


def fetch_xml(url: str, timeout: int = 15) -> ET.Element:
    req = urllib.request.Request(url, headers={"Accept": "application/xml"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            data = resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"HTTP {e.code} for {url}\n{body}") from e
    except urllib.error.URLError as e:
        raise RuntimeError(f"Request failed for {url}: {e}") from e

    try:
        root = ET.fromstring(data)
    except ET.ParseError as e:
        raise RuntimeError(f"Invalid XML response from {url}") from e
    return root


def get_movie_sections(base_url: str, token: str) -> list[tuple[str, str]]:
    url = build_url(base_url, "/library/sections", token)
    root = fetch_xml(url)
    sections: list[tuple[str, str]] = []

    for directory in root.findall("Directory"):
        if directory.attrib.get("type") == "movie":
            key = directory.attrib.get("key")
            title = directory.attrib.get("title", "(untitled section)")
            if key:
                sections.append((key, title))

    return sections


def iter_section_movies(
    base_url: str,
    token: str,
    section_key: str,
    title_query: str,
) -> Iterable[ET.Element]:
    url = build_url(
        base_url,
        f"/library/sections/{section_key}/all",
        token,
        query={"title": title_query},
    )
    root = fetch_xml(url)
    yield from root.findall("Video")


def iter_all_section_movies(
    base_url: str,
    token: str,
    section_key: str,
    page_size: int = 200,
) -> Iterable[ET.Element]:
    start = 0
    while True:
        url = build_url(
            base_url,
            f"/library/sections/{section_key}/all",
            token,
            query={
                "X-Plex-Container-Start": str(start),
                "X-Plex-Container-Size": str(page_size),
            },
        )
        root = fetch_xml(url)
        videos = root.findall("Video")
        if not videos:
            return

        yield from videos

        start += len(videos)
        total_size_raw = root.attrib.get("totalSize")
        if total_size_raw and start >= int(total_size_raw):
            return
        if len(videos) < page_size:
            return


def find_movie(
    base_url: str,
    token: str,
    target_title: str,
    target_year: int | None = None,
    exact_title: bool = False,
) -> list[MovieResult]:
    sections = get_movie_sections(base_url, token)
    if not sections:
        return []

    target_norm = normalize_title(target_title)
    matches: list[MovieResult] = []

    for section_key, section_title in sections:
        filtered_candidates = list(iter_section_movies(base_url, token, section_key, target_title))
        if filtered_candidates:
            candidates: Iterable[ET.Element] = filtered_candidates
        else:
            candidates = iter_all_section_movies(base_url, token, section_key)

        for video in candidates:
            movie_title = video.attrib.get("title", "")
            movie_year = video.attrib.get("year")
            searchable_titles = [
                movie_title,
                video.attrib.get("originalTitle", ""),
                video.attrib.get("titleSort", ""),
            ]
            movie_norms = [normalize_title(t) for t in searchable_titles if t]

            if exact_title:
                if target_norm not in movie_norms:
                    continue
            elif not any(target_norm in movie_norm for movie_norm in movie_norms):
                continue
            if target_year is not None and str(target_year) != (movie_year or ""):
                continue

            matches.append(
                MovieResult(
                    section_key=section_key,
                    section_title=section_title,
                    rating_key=video.attrib.get("ratingKey", ""),
                    title=movie_title,
                    year=movie_year,
                )
            )

    return matches


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Check whether a movie exists in Plex movie libraries."
    )
    parser.add_argument("--base-url", required=True, help="Plex server URL, e.g. http://127.0.0.1:32400")
    parser.add_argument("--token", default=os.getenv("PLEX_TOKEN"), help="Plex token (or set PLEX_TOKEN env var)")
    parser.add_argument("--title", required=True, help="Movie title to search")
    parser.add_argument("--year", type=int, help="Optional release year for exact filtering")
    parser.add_argument(
        "--exact-title",
        action="store_true",
        help="Require exact normalized title match (default: substring match like Plex search).",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.token:
        print("Error: Plex token is required. Pass --token or set PLEX_TOKEN.", file=sys.stderr)
        return 2

    try:
        matches = find_movie(
            args.base_url,
            args.token,
            args.title,
            args.year,
            args.exact_title,
        )
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

    if not matches:
        year_suffix = f" ({args.year})" if args.year else ""
        print(f"NOT_FOUND: '{args.title}'{year_suffix}")
        return 3

    print(f"FOUND: {len(matches)} match(es)")
    for m in matches:
        yr = m.year or "unknown"
        print(
            f"- title='{m.title}', year={yr}, section='{m.section_title}'(key={m.section_key}), ratingKey={m.rating_key}"
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
