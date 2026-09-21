# Moon Mansions

Moon phase, illumination, zodiac sign, and lunar mansions across three traditions — plus planets and calendars — in Raycast.

> Prefer a native app? [Moon Mansions for Mac](https://github.com/minhaajre/moon-mansions-mac/releases) is free — same engine as a menu-bar app, no Raycast needed.

## Commands

- **Show Moon Info** — Detail view: phase, illumination %, moon age, tropical zodiac, Arab manzil (number, name, divine name, degrees, rating, theme), Vedic nakshatra (ruler, deity, theme), Chinese lodge (palace, theme), all seven classical planets with sign, degree and direct/retrograde motion, and a Calendars section (Hijri date, Chinese day/month pillars with animals, Vedic tithi, masa and vara).
- **Moon in Menu Bar** — `🌙 76%` in the menu bar with the same data in dropdown sections, tap-to-copy on every row.

## Astronomy

Zero runtime dependencies. Lunar math is a Meeus Ch.47 truncation ported from a guide cross-checked against AstroSeek (±1–2°, adequate for 12.857° mansions). Planets use JPL approximate Keplerian elements, verified against a published ephemeris (≤0.5°). Vedic positions use the same Lahiri ayanamsa as the author's Ibn Arabi app. The Chinese lodge is an equal-slice approximation anchored at Horn/Spica — true lodge widths are unequal. Hijri output is the tabular Islamic calendar (±1–2 days vs moon-sighting).
