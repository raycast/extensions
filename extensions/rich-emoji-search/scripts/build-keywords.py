#!/usr/bin/env python3
"""Build src/keywords.json — search synonyms for every emoji rich ships.

    python3 scripts/build-keywords.py

rich's names are the only text the extension would otherwise have to search, and
they are literal: `flag_for_united_states` contains no "US", `grinning_face` no
"happy". This script attaches synonyms from three sources, keyed by the emoji
character (not the rich name, since several names share one character):

1. CLDR annotations — Unicode's own human-written search keywords, the same set
   that powers emoji pickers on macOS/Android. This is where "tada" gains
   "celebrate", "hooray", "party", and where "grinning" gains "happy", "smile".
2. Regional indicator decoding — a flag emoji literally encodes its ISO 3166
   alpha-2 code in its codepoints (U+1F1FA U+1F1F8 spells "US"), so country
   codes are derived exactly rather than guessed. Subdivision flags such as
   England use tag sequences and are decoded the same way.
3. A small hand-curated table of country nicknames that no data source implies —
   most importantly "uk", since the United Kingdom's alpha-2 code is "GB".

Output is a {character: [keyword, ...]} map. The extension merges these with the
words of each rich name at load time, so keywords already present in a name cost
nothing here.
"""

import json
import re
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EMOJI_JSON = ROOT / "src" / "emoji.json"
DESTINATION = ROOT / "src" / "keywords.json"

# CLDR ships base annotations plus "derived" ones covering skin-tone and other
# composed sequences. rich uses a lot of both, so we need the two files.
CLDR_SOURCES = [
    "https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotations/en.xml",
    "https://raw.githubusercontent.com/unicode-org/cldr/main/common/annotationsDerived/en.xml",
]

VARIATION_SELECTOR = "️"
REGIONAL_INDICATOR_A = 0x1F1E6
TAG_SPACE = 0xE0020
TAG_CANCEL = 0xE007F

# Nicknames a machine cannot derive: alpha-2 codes that people simply don't use,
# plus the few countries with a dominant colloquial name. Keep this list short —
# everything else should come from CLDR or the codepoints.
COUNTRY_NICKNAMES = {
    "GB": ["uk", "britain", "british", "great britain", "english", "england"],
    "US": ["us", "usa", "america", "american", "united states of america"],
    "AE": ["uae", "emirates"],
    "KR": ["south korea", "korea"],
    "KP": ["north korea", "korea"],
    "RU": ["russia", "russian"],
    "NL": ["holland", "dutch"],
    "CH": ["swiss"],
    "CZ": ["czech republic", "czechia"],
    "CD": ["drc", "congo kinshasa"],
    "CG": ["congo brazzaville"],
    "VA": ["vatican"],
    "MM": ["burma"],
    "TR": ["turkiye"],
    "CI": ["ivory coast"],
    "SZ": ["swaziland"],
    "MK": ["macedonia"],
    "TL": ["east timor"],
    "LA": ["laos"],
    "SY": ["syria"],
    "TZ": ["tanzania"],
    "BO": ["bolivia"],
    "VE": ["venezuela"],
    "IR": ["iran"],
    "MF": ["saint martin"],
    "EU": ["european union", "europe"],
}


def fetch_cldr_annotations() -> dict[str, dict[str, str]]:
    """Return {character: {"keywords": "a | b", "name": "tts name"}}."""
    annotations: dict[str, dict[str, str]] = {}
    for url in CLDR_SOURCES:
        with urllib.request.urlopen(url) as response:
            tree = ET.fromstring(response.read())
        for annotation in tree.iter("annotation"):
            character = annotation.get("cp")
            if not character or not annotation.text:
                continue
            key = "name" if annotation.get("type") == "tts" else "keywords"
            annotations.setdefault(character, {})[key] = annotation.text
    return annotations


def annotation_for(character: str, annotations: dict[str, dict[str, str]]) -> dict[str, str]:
    """Look a character up, tolerating variation-selector differences.

    rich stores several emoji without U+FE0F (`✈`, `⚗`) while CLDR keys them in
    fully-qualified form, so a direct lookup misses roughly 200 entries.
    """
    bare = character.replace(VARIATION_SELECTOR, "")
    for candidate in (character, character + VARIATION_SELECTOR, bare, bare + VARIATION_SELECTOR):
        if candidate in annotations:
            return annotations[candidate]
    return {}


def region_code(character: str) -> str | None:
    """Decode the ISO 3166 code a flag emoji encodes in its own codepoints."""
    codepoints = [ord(c) for c in character if c != VARIATION_SELECTOR]

    indicators = [c for c in codepoints if REGIONAL_INDICATOR_A <= c <= REGIONAL_INDICATOR_A + 25]
    if len(indicators) == 2 and len(indicators) == len(codepoints):
        return "".join(chr(c - REGIONAL_INDICATOR_A + ord("A")) for c in indicators)

    # Subdivision flags (🏴󠁧󠁢󠁥󠁮󠁧󠁿) carry an ASCII code in tag characters, e.g. "gbeng".
    tags = [chr(c - TAG_SPACE + ord(" ")) for c in codepoints if TAG_SPACE <= c < TAG_CANCEL]
    if tags:
        return "".join(tags).upper()

    return None


def is_regional_indicator_letter(character: str) -> bool:
    codepoints = [ord(c) for c in character]
    return len(codepoints) == 1 and REGIONAL_INDICATOR_A <= codepoints[0] <= REGIONAL_INDICATOR_A + 25


# Words that carry no search signal but ride along in CLDR phrases and display
# names ("flag: United States of America", "pile of poo").
STOPWORDS = {"of", "the", "and", "a", "an", "with", "for", "in", "on", "at", "to", "or"}


def words(text: str) -> list[str]:
    return [w for w in re.split(r"[^a-z0-9]+", text.lower()) if w and w not in STOPWORDS]


# Neither rich nor CLDR spells anything in short form: ℹ is annotated
# "i | information", so typing the way people actually type ("info") has nothing
# to match against. Each word here contributes its everyday shortenings to any
# emoji already annotated with the long form.
ABBREVIATIONS = {
    "information": ["info"],
    "photograph": ["photo", "pic", "picture"],
    "telephone": ["phone"],
    "microphone": ["mic"],
    "laboratory": ["lab", "science"],
    "mathematics": ["math", "maths"],
    "television": ["tv"],
    "refrigerator": ["fridge"],
    "bicycle": ["bike"],
    "automobile": ["car", "auto"],
    "motorcycle": ["moto", "bike"],
    "advertisement": ["ad"],
    "application": ["app"],
    "administrator": ["admin"],
    "veterinarian": ["vet"],
    "hippopotamus": ["hippo"],
    "rhinoceros": ["rhino"],
    "chimpanzee": ["chimp"],
    "alligator": ["gator"],
    "congratulations": ["congrats"],
    "exclamation": ["exclaim"],
    "percentage": ["percent"],
    "temperature": ["temp"],
    "electricity": ["electric", "bolt", "zap"],
    "celebration": ["celebrate"],
    "photography": ["photo"],
    "gymnastics": ["gym"],
    "professor": ["prof"],
    "mountain": ["mount"],
    "airplane": ["plane"],
    "helicopter": ["chopper"],
    "ambulance": ["ambo"],
    "document": ["doc"],
    "calculator": ["calc"],
    "keyboard": ["keys"],
    "battery": ["charge", "power", "energy"],
}


def expand_abbreviations(collected: list[str]) -> list[str]:
    """Add short forms for any long word already present."""
    extra: list[str] = []
    for term in collected:
        for word in term.split(" "):
            extra.extend(ABBREVIATIONS.get(word, []))
    return extra


def keywords_for(character: str, annotations: dict[str, dict[str, str]]) -> list[str]:
    annotation = annotation_for(character, annotations)
    collected: list[str] = []

    # CLDR keywords are pipe-separated and may be multi-word ("great britain").
    # Keep the phrase and its individual words: the phrase helps exact matches,
    # the words make each part searchable on its own.
    for phrase in annotation.get("keywords", "").split("|"):
        phrase = phrase.strip().lower()
        if phrase:
            collected.append(phrase)
            collected.extend(words(phrase))

    # The CLDR display name ("flag: United States", "pile of poo") is often
    # richer than rich's own name.
    if name := annotation.get("name"):
        collected.extend(words(name))

    code = region_code(character)
    if code:
        collected.append("flag")
        collected.append(code.lower())
        if len(code) > 2:  # subdivision, e.g. GBENG -> gb, eng
            collected.extend([code[:2].lower(), code[2:].lower()])
        for nickname in COUNTRY_NICKNAMES.get(code, []):
            collected.append(nickname)
            collected.extend(words(nickname))

    if is_regional_indicator_letter(character):
        # CLDR has no annotation for the bare letters rich exposes as
        # `regional_indicator_a`; name them so they stay findable.
        letter = unicodedata.name(character).rsplit(" ", 1)[-1].lower()
        collected.extend(["regional indicator", "flag letter", letter])

    # Short forms come only from the CLDR annotation, never from rich's names.
    # Keywords here are stored per character, and a character answers to several
    # names — expanding `information_desk_person` would hand "info" to
    # `person_tipping_hand` too, which has nothing to do with information.
    collected.extend(expand_abbreviations(collected))

    # Preserve first-seen order so the most specific terms sort first.
    unique = list(dict.fromkeys(k for k in collected if k))

    # Drop any multi-word phrase whose words all survive individually — Raycast
    # matches per query token, so the phrase adds no recall, only bytes. This
    # cuts the generated file by roughly a third.
    singles = {k for k in unique if " " not in k}
    return [k for k in unique if " " not in k or not all(w in singles for w in words(k))]


def main() -> None:
    emoji = json.loads(EMOJI_JSON.read_text(encoding="utf-8"))
    annotations = fetch_cldr_annotations()

    keywords: dict[str, list[str]] = {}
    uncovered = []
    for character in dict.fromkeys(emoji.values()):
        entry = keywords_for(character, annotations)
        if entry:
            keywords[character] = entry
        else:
            uncovered.append(character)

    # `npm run update-data` runs Prettier over the result, which is what keeps
    # `ray lint` happy — don't hand-tune the formatting here.
    DESTINATION.write_text(json.dumps(keywords, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    total = len(set(emoji.values()))
    print(f"wrote keywords for {len(keywords)}/{total} characters to {DESTINATION}")
    if uncovered:
        print(f"no keywords found for {len(uncovered)}: {' '.join(uncovered)}")


if __name__ == "__main__":
    main()
