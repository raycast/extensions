# DNB Book Lookup

Quick access to book contents from Deutsche Nationalbibliothek (DNB) by ISBN,
with optional AI-generated Klappentext for book listings.

## Features

- ISBN-10 and ISBN-13 support (with or without hyphens)
- Automatic availability check for table of contents and content text
- Auto-fill ISBN from selected text when the ISBN argument is left empty
- Optional AI-generated Klappentext (max. 150 words) + 5 keywords
  - Source verification via Google Books and Wikipedia
  - Confidence score and source transparency
  - Falls back to opening PDF if AI is unavailable
- Automatic fallback to catalog entry when no content is available

## Usage

1. Open Raycast
2. Type "Look up DNB Book"
3. Enter ISBN (e.g. `978-3-59335-383-8` or `9783593353838`)
4. Press Enter

## Preferences

The extension automatically opens all available content (table of contents and/or content text).

- **Generate Klappentext**: Enable AI-generated book description (requires Raycast Pro or BYOK)

## AI Requirements

Requires Raycast Pro or BYOK (Bring Your Own Key):

- Anthropic (Claude)
- OpenAI (GPT-4)
- Google (Gemini)

## DNB URL Structure

- `https://d-nb.info/{IDN}/04` — Table of Contents
- `https://d-nb.info/{IDN}/34` — Content Text
- `https://d-nb.info/{IDN}` — Catalog Entry (fallback)

## Roadmap

### v2.0 (planned)

- **Klappentext without TOC**: Generate AI description from title and
  author alone, using Google Books, Wikipedia, and Open Library —
  even when no digitized table of contents is available in DNB
- **Open Library** as additional description source
- **TOC-via-Clipboard**: Paste TOC text directly via an Action in the
  Detail View instead of an argument field

## License

MIT
