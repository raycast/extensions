# CLAUDE.md — Ramadan Prayer Times Raycast Extension

## Project Overview

A Raycast extension that shows Iftar (Maghrib) and Sehri (Fajr/Imsak) times for Ramadan. Users type `ramadan` to see both times, `iftar` to see Iftar time, or `sehri`/`sehoor` to see Sehri time. Inspired by [ramadan-cli](https://github.com/ahmadawais/ramadan-cli) but built natively for Raycast using the [AlAdhan Prayer Times API](https://aladhan.com/prayer-times-api).

---

## Tech Stack

- **Runtime**: Raycast Extension (React + TypeScript)
- **API**: `@raycast/api` and `@raycast/utils`
- **Data source**: AlAdhan Prayer Times API (free, no auth required)
- **No external dependencies** beyond Raycast's own packages (use native `fetch`)

---

## Commands to Implement

Define three commands in `package.json`, all `mode: "view"`:

| Command file | name | title | keywords | Behavior |
|---|---|---|---|---|
| `src/ramadan.tsx` | `ramadan` | `Ramadan Companion` | `ramadan`, `ramzan`, `roza`, `prayer` | Show both Sehri and Iftar for today with countdown |
| `src/iftar.tsx` | `iftar` | `Iftar Time` | `iftar`, `maghrib`, `fast`, `break` | Show Iftar (Maghrib) time with countdown |
| `src/sehri.tsx` | `sehri` | `Sehri Time` | `sehri`, `sehoor`, `sahur`, `fajr`, `imsak` | Show Sehri (Fajr) time with countdown |

All three commands share the same core data-fetching logic — extract it into `src/lib/` or `src/utils/`.

---

## AlAdhan API Usage

### Primary endpoint

```
GET https://api.aladhan.com/v1/timingsByCity/:date?city={city}&country={country}&method={method}&school={school}
```

- `:date` — use format `DD-MM-YYYY` for today's date, or a Unix timestamp
- `city` — e.g. `Lahore`
- `country` — e.g. `Pakistan` or `PK`
- `method` — calculation method ID (integer), see below
- `school` — `0` for Shafi (default), `1` for Hanafi

### Fallback endpoint (by coordinates)

```
GET https://api.aladhan.com/v1/timings/:date?latitude={lat}&longitude={lng}&method={method}&school={school}
```

### Relevant fields from response

```typescript
interface AlAdhanResponse {
  code: number;
  status: string;
  data: {
    timings: {
      Fajr: string;      // "05:21" — use as Sehri time
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Maghrib: string;   // "17:25" — use as Iftar time
      Isha: string;
      Imsak: string;     // "05:11" — alternative Sehri (10 min before Fajr)
      // ... other fields
    };
    date: {
      readable: string;         // "01 Dec 2023"
      hijri: {
        date: string;           // "17-05-1445"
        day: string;
        weekday: { en: string; ar: string };
        month: { number: number; en: string; ar: string };
        year: string;
        holidays: string[];
      };
      gregorian: {
        date: string;
        weekday: { en: string };
        month: { number: number; en: string };
        year: string;
      };
    };
    meta: {
      latitude: number;
      longitude: number;
      timezone: string;
      method: { id: number; name: string };
    };
  };
}
```

### Key mapping

- **Sehri time** = `timings.Fajr` (some users prefer `timings.Imsak` which is ~10 min earlier — consider showing both or making it a preference)
- **Iftar time** = `timings.Maghrib`

---

## Calculation Methods (for preferences dropdown)

These are the method IDs to offer in the extension preferences:

| ID | Name | Common Region |
|---|---|---|
| 1 | University of Islamic Sciences, Karachi | Pakistan, Bangladesh, India, Afghanistan |
| 2 | Islamic Society of North America (ISNA) | North America |
| 3 | Muslim World League (MWL) | Europe, Far East |
| 4 | Umm Al-Qura University, Makkah | Saudi Arabia |
| 5 | Egyptian General Authority of Survey | Africa, Syria, Iraq, Lebanon |
| 7 | Institute of Geophysics, University of Tehran | Iran (Shia) |
| 8 | Gulf Region | UAE, Oman |
| 9 | Kuwait | Kuwait |
| 10 | Qatar | Qatar |
| 11 | Majlis Ugama Islam Singapura | Singapore |
| 12 | Union Organization Islamic de France | France |
| 13 | Diyanet İşleri Başkanlığı | Turkey |
| 14 | Spiritual Administration of Muslims of Russia | Russia |
| 15 | Moonsighting Committee Worldwide | Global |
| 16 | Dubai (experimental) | Dubai |
| 17 | JAKIM | Malaysia |
| 20 | Kementerian Agama | Indonesia |
| 21 | Morocco | Morocco |
| 23 | Ministry of Awqaf, Jordan | Jordan |

**Default for Pakistan**: Method `1` (Karachi), School `1` (Hanafi).

---

## Extension Preferences

Define these in `package.json` under `"preferences"`:

```json
[
  {
    "name": "city",
    "type": "textfield",
    "required": true,
    "title": "City",
    "description": "Your city name (e.g., Lahore, London, New York)",
    "default": "Lahore"
  },
  {
    "name": "country",
    "type": "textfield",
    "required": true,
    "title": "Country",
    "description": "Your country name or code (e.g., Pakistan, PK, United States, US)",
    "default": "Pakistan"
  },
  {
    "name": "method",
    "type": "dropdown",
    "required": true,
    "title": "Calculation Method",
    "description": "Prayer time calculation method",
    "default": "1",
    "data": [
      { "title": "Karachi - University of Islamic Sciences", "value": "1" },
      { "title": "ISNA - Islamic Society of North America", "value": "2" },
      { "title": "MWL - Muslim World League", "value": "3" },
      { "title": "Umm Al-Qura, Makkah", "value": "4" },
      { "title": "Egyptian General Authority of Survey", "value": "5" },
      { "title": "Tehran - Institute of Geophysics", "value": "7" },
      { "title": "Gulf Region", "value": "8" },
      { "title": "Kuwait", "value": "9" },
      { "title": "Qatar", "value": "10" },
      { "title": "Singapore - MUIS", "value": "11" },
      { "title": "France - UOIF", "value": "12" },
      { "title": "Turkey - Diyanet", "value": "13" },
      { "title": "Russia", "value": "14" },
      { "title": "Moonsighting Committee", "value": "15" },
      { "title": "Dubai (experimental)", "value": "16" },
      { "title": "JAKIM - Malaysia", "value": "17" },
      { "title": "Kementerian Agama - Indonesia", "value": "20" },
      { "title": "Morocco", "value": "21" },
      { "title": "Jordan", "value": "23" }
    ]
  },
  {
    "name": "school",
    "type": "dropdown",
    "required": true,
    "title": "Juristic School (Asr calculation)",
    "description": "Shafi: shadow = object length. Hanafi: shadow = 2x object length.",
    "default": "1",
    "data": [
      { "title": "Shafi / Maliki / Hanbali", "value": "0" },
      { "title": "Hanafi", "value": "1" }
    ]
  },
  {
    "name": "timeFormat",
    "type": "dropdown",
    "required": false,
    "title": "Time Format",
    "description": "Display times in 12-hour or 24-hour format",
    "default": "12h",
    "data": [
      { "title": "12-hour (5:21 AM)", "value": "12h" },
      { "title": "24-hour (05:21)", "value": "24h" }
    ]
  },
  {
    "name": "sehriSource",
    "type": "dropdown",
    "required": false,
    "title": "Sehri Time Source",
    "description": "Use Fajr time or Imsak (10 min before Fajr) for Sehri end",
    "default": "fajr",
    "data": [
      { "title": "Fajr (Azan time)", "value": "fajr" },
      { "title": "Imsak (precautionary, ~10 min before Fajr)", "value": "imsak" }
    ]
  }
]
```

---

## UI Design

### `ramadan` command (main view) — use `Detail` view

Show a rich markdown detail view with:

```
🌙 Ramadan Companion — {City}, {Country}
{Gregorian date} · {Hijri date}

🍽 Sehri (Fajr):  5:21 AM
🌅 Iftar (Maghrib): 5:25 PM

⏳ Next: Iftar in 3h 42m
```

**Metadata sidebar** (using `Detail.Metadata`):

- Hijri date
- Calculation method name
- Sunrise, Dhuhr, Asr, Isha times (secondary info)
- Roza number (day of Ramadan, if during Ramadan)

**Actions** (`ActionPanel`):

- Copy Sehri time
- Copy Iftar time
- Copy both times as formatted text
- Open AlAdhan website
- Open preferences

### `iftar` command — use `Detail` view

Focused single-value view:

```
🌅 Iftar Time — {City}
5:25 PM

⏳ {countdown or "Iftar time has passed for today"}
```

### `sehri` command — use `Detail` view

```
🌙 Sehri Time — {City}
5:21 AM

⏳ {countdown or "Sehri time has passed for today"}
```

---

## Countdown Logic

Calculate the time remaining until the next Sehri or Iftar:

```typescript
function getCountdown(timeStr: string, timezone: string): string {
  // Parse "HH:MM" from API
  // Compare with current time in the user's timezone
  // Return "Xh Ym" or "Time has passed for today"
}
```

- The API returns times in the timezone of the location, so parse accordingly.
- Use `Intl.DateTimeFormat` with the timezone from `meta.timezone` in the API response to get current local time.
- If the time has passed today, say so (don't show negative countdown).

---

## Ramadan Detection

To show "Roza #N" (day of Ramadan):

1. The API response includes `data.date.hijri.month.number` — Ramadan is Hijri month **9**.
2. If `hijri.month.number === 9`, the day number is `hijri.day`.
3. If not Ramadan, show a note: "Ramadan has not started yet" or "Ramadan is over" with the next expected date (or just omit the roza number).

---

## Project File Structure

```
ramadan-raycast/
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── assets/
│   └── extension-icon.png    # 512x512 — moon/crescent themed
├── src/
│   ├── ramadan.tsx            # Main command: both times
│   ├── iftar.tsx              # Iftar-only command
│   ├── sehri.tsx              # Sehri-only command
│   └── lib/
│       ├── api.ts             # AlAdhan API fetch + types
│       ├── preferences.ts     # Typed preference access
│       ├── time.ts            # Time formatting + countdown helpers
│       └── types.ts           # Shared TypeScript interfaces
└── CLAUDE.md
```

---

## Shared Data Fetching Pattern

Use `useCachedPromise` from `@raycast/utils` so the extension loads instantly on repeat opens:

```typescript
// src/lib/api.ts
import { Cache } from "@raycast/api";

const cache = new Cache();
const CACHE_KEY = "prayer-times";
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function fetchPrayerTimes(city: string, country: string, method: string, school: string) {
  const today = new Date();
  const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;

  const url = `https://api.aladhan.com/v1/timingsByCity/${dateStr}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&method=${method}&school=${school}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`API error: ${response.status}`);

  const json = await response.json();
  if (json.code !== 200) throw new Error(`AlAdhan error: ${json.status}`);

  return json.data;
}
```

In each command file:

```typescript
import { useCachedPromise } from "@raycast/utils";
import { fetchPrayerTimes } from "./lib/api";

const { data, isLoading, error } = useCachedPromise(
  fetchPrayerTimes,
  [city, country, method, school],
  { keepPreviousData: true }
);
```

---

## Cache Strategy

- Cache the API response for the current date using `Cache` from `@raycast/api`.
- Key the cache on `{city}-{country}-{method}-{school}-{date}` so it invalidates daily.
- Prayer times for a given day don't change, so a long TTL (hours) is fine.
- Use `useCachedPromise` with `initialData` from sync cache read for instant load (no flash).

---

## Time Formatting Helper

```typescript
export function formatTime(time24: string, format: "12h" | "24h"): string {
  if (format === "24h") return time24;

  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}
```

---

## Error Handling

- If the API call fails, show a `Toast` with `Toast.Style.Failure` and the error message.
- If the city/country is not found, the API returns a `200` with a message string instead of data — detect this and show a helpful error asking the user to check their preferences.
- Validate the API response shape before accessing nested properties.

---

## Extension Icon

Create a 512x512 PNG with a crescent moon symbol. Use ImageMagick:

```bash
convert -size 512x512 xc:'#1a1a2e' -fill '#f0c040' -gravity center \
  -font Helvetica-Bold -pointsize 300 -annotate +0+10 '🌙' \
  assets/extension-icon.png
```

Or use a proper crescent moon SVG converted to PNG. The icon should feel Ramadan-themed (dark background with gold/warm crescent).

---

## Key Implementation Notes

1. **No API key needed** — AlAdhan is free and open.
2. **Times are local** — The API returns times in the local timezone of the requested city. The `meta.timezone` field tells you which timezone.
3. **Sehri = Fajr or Imsak** — Configurable via preference. Fajr is the azan time; Imsak is ~10 minutes before (precautionary stop eating time).
4. **Iftar = Maghrib** — This is the sunset prayer time when the fast breaks.
5. **12h vs 24h** — Respect the user's preference. Default to 12-hour for readability.
6. **Ramadan month detection** — Hijri month 9. Use `data.date.hijri.month.number` from the API response.
7. **Actions** — Always provide copy-to-clipboard actions. Users expect this in Raycast.
8. **Keep it fast** — Use caching aggressively. Prayer times for a day don't change.

---

## Development Commands

```bash
npm install
npm run dev        # Hot reload during development
npm run lint       # Check for issues
npm run fix-lint   # Auto-fix lint issues
npm run build      # Production build
```

---

## Testing Checklist

- [ ] `ramadan` command shows both Sehri and Iftar correctly
- [ ] `iftar` command shows only Iftar time
- [ ] `sehri` command shows only Sehri time
- [ ] Countdown timer shows correct remaining time
- [ ] Times display correctly in both 12h and 24h format
- [ ] Changing city/country in preferences fetches new data
- [ ] All calculation methods return valid data
- [ ] Hanafi vs Shafi school preference works
- [ ] Imsak vs Fajr preference for Sehri works
- [ ] Copy actions work for all time values
- [ ] Error toast shows when API fails or city not found
- [ ] Extension loads instantly on second open (cache working)
- [ ] Hijri date displays correctly
- [ ] Roza number shows correctly during Ramadan month
- [ ] Works when not Ramadan (graceful messaging)
