# Quran

Search Quran ayahs by Arabic text, surah name, or reference (e.g. `2:255`) and paste or copy them to the clipboard.

## Install

```bash
git clone https://github.com/AmmarCodes/raycast-quran
cd raycast-quran
npm install
npm run dev   # start in development mode
```

To install the extension permanently, run `npm run build` then import the extension via Raycast's Extensions UI.

## Usage

1. Open Raycast and run **Quran: Search Ayah**
2. Type a query:
   - Arabic text (with or without diacritics) — e.g. `الرحمن` or `ٱلرَّحْمَٰن`
   - Surah and ayah — e.g. `2:255` or `٢:٢٥٥`
   - Ayah number — e.g. `255` (matches across all surahs)
3. Select an ayah:
   - **Enter** — paste the ayah into the frontmost app
   - **Cmd+Enter** — copy to clipboard

## Features

- **Offline-first** — all Quran data is bundled, no network calls
- **Arabic normalization** — search with or without diacritics, alef variants, and Eastern Arabic digits
- **Numeric references** — find by `surah:ayah` (e.g. `2:255` or `٢:٢٥٥`) or plain ayah number
- **Paste or copy** — Enter to paste into frontmost app, Cmd+Enter to copy

## Data

QPC Hafs script by [QUL/Tarteel](https://qul.tarteel.ai/resources/quran-script/86), 6,236 ayahs across 114 surahs.
