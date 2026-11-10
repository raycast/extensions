# Venue Rank

Venue Rank searches computer science conferences and journals by acronym, full name, or alias. It shows source-specific CCF 2026 and ICORE2026 assessments from a bundled snapshot. No account, API key, or network connection is required for searching.

## Usage

Open **Search Venues** and type a venue name, such as `SIGCOMM`, `AAAI`, or `TKDE`. You can filter conferences and journals with the dropdown.

- You can press Return to open the selected venue’s details.
- You can press Command-D to toggle the split preview.
- You can press Command-Shift-C to copy the assessments and dataset version.
- You can press Command-I to read the source notes and dataset context.
- You can use the action panel to open the original source or DBLP in your browser.

## Screenshots

The list keeps venue names and assessments together.

![Venue search results.](media/list.jpg)

The detail view shows each source and edition.

![Venue details.](media/detail.jpg)

The optional preview shows details alongside the search results.

![The split preview.](media/preview.jpg)

## Assessment coverage

The bundled snapshot contains 1,347 venue identities and 1,666 assessments. Its 679 CCF entries come from the 2026 community transcription in [CCFrank4dblp](https://github.com/WenyanLiu/CCFrank4dblp/tree/540396b36bfb46b18cfed22bf5c578d73257c4b9). Its 987 ICORE2026 entries come from the [official conference portal](https://portal.core.edu.au/conf-ranks/). Each source retains its own scale and edition.

**Not verified** means that this snapshot contains no verified association with that list. It does not establish that a venue is unranked. ICORE’s conference list does not apply to journals. CSRankings, Tsinghua, and HKUST lists are not included.

The data is bundled with the extension and updates through extension releases. Opening external source links requires an internet connection. The project is independent of the ranking publishers. [NOTICE.md](NOTICE.md) documents the data provenance and third-party attribution.

## Development

Run `npm ci`, then `npm run dev`. Run `npm run lint` and `npm run build` before submitting a change.

The catalog source in `src/catalog` and the Raycast command are exported from the shared Venue Rank project. The extension includes its own copy so the Store build does not depend on an unpublished npm package or a sibling checkout. Updates should regenerate that source from the shared project and include the corresponding dataset version and notices.
