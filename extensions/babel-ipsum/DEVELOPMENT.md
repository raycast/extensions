# Development

Babel Ipsum is a macOS Raycast extension. For usage, see [README.md](README.md); for book coverage and attribution, see [corpus/NOTICE.md](corpus/NOTICE.md).

## Setup

Use Node.js **22.14.0 or newer**, npm, and Raycast on macOS. Python 3 is needed only to extract source text and run extraction tests. The checked-in `assets/corpus.db` is read-only at runtime; the extension makes no network requests and does not persist generated text.

```sh
npm ci
npm run dev
```

To compile without registering the extension in Raycast, run `npm run build`. Output is written to `dist/`.

## Corpus sources and rebuilds

The repository keeps prepared text and its provenance; downloaded source pages live in an ignored cache:

```text
assets/
  corpus.db                        # Tracked runtime database
corpus/
  books/<book-id>.json              # All 15 prepared books, including sub-terra
  provenance/<book-id>.json         # Retrieval dates, encodings, and snapshot hashes
  editorial/sub-terra/              # Original transcription, corrections, policy, scans
  NOTICE.md
  LICENSE.md                       # Corpus licensing scope
.cache/corpus/                     # Ignored development downloads
  sources/<book-id>/*.html
  vocabulary.txt
tests/fixtures/                    # Small tracked extraction regressions
```

[`corpus/NOTICE.md`](corpus/NOTICE.md) summarizes source attribution and reuse terms. Sub terra's [modernization policy](corpus/editorial/sub-terra/MODERNIZATION.md) and [scan evidence](corpus/editorial/sub-terra/SCANS.md) remain tracked beside its original transcription and exact corrections.

Rebuild the runtime database from the tracked prepared JSON:

```sh
npm run corpus:build
```

This build needs neither Python, downloaded HTML, nor network access. Normal tests also work without `.cache/`. The broader prepared text remains tracked so the runtime sampling budget can change without downloading sources again.

Source acquisition and extraction are explicit development operations. Fetch the relevant sources first, then prepare and review the changed JSON and provenance before rebuilding:

```sh
npm run corpus:fetch                  # Sub terra snapshots
npm run corpus:extract                # Extract and modernize Sub terra
npm run corpus:fetch:western          # Refresh and prepare seven Western books
npm run corpus:extract:western        # Replay cached Western sources offline
npm run corpus:fetch:multilingual     # Fetch missing sources and prepare seven books
npm run corpus:extract:multilingual   # Replay cached multilingual sources offline
npm run corpus:build
```

The multilingual fetch command retains existing snapshots; it does not refresh them. `npm run corpus:prepare:sub-terra` reapplies the tracked editorial corrections without needing HTML. The shared import commands route Dante and Greek to `scripts/import-historical-dante-greek.py`, and Korean/Hindi to `scripts/import-historical-hindi-korean.py`. These adapters retain pinned snapshots; `--refresh` does not replace their historical inputs. Full extraction replay requires the matching snapshots in `.cache/`; a fresh checkout does not include them. Source changes can invalidate contextual corrections and must be reviewed.

With cached sources available, `npm run corpus:audit` checks all recorded snapshot hashes, including edition and reuse evidence, checks Sub terra's editorial preparation, and verifies both importers' full extraction without rewriting prepared books or provenance. Runtime generation never fetches sources.

## Checks

```sh
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:extraction
npm run build
```

## Publishing

Run these commands from the source repository, after reviewing the changes:

```sh
npm run build
npm run publish
```

The publish command authenticates with GitHub and opens a pull request in [`raycast/extensions`](https://github.com/raycast/extensions). Raycast reviews the contribution; once the pull request is merged, the extension is automatically published to the Store. Running the command again updates the submission. This is not an npm registry release.

The installed directory at `~/.config/raycast/extensions/babel-ipsum` contains compiled commands and runtime assets. It is local build output, not the source directory to submit.

See Raycast's [publishing guide](https://developers.raycast.com/basics/publish-an-extension) and [Store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store) for the current submission requirements. Store screenshots belong in `metadata/`; promotional illustrations are separate from screenshots of the extension.

## Artwork

**Library Rascal — Vermilion** is the official Babel Ipsum identity: a sly cat-shaped document and offset copy sheet in vermilion and near-black ink on warm ivory paper. The 512-pixel icon is packaged at `assets/extension-icon.png`; the promotional poster is retained at [media/poster.webp](media/poster.webp).

Lossless WebP masters, exact prompts, and palette notes are in [the Library Rascal set](artwork/README.md). With ImageMagick installed, run `npm run artwork:build` to regenerate the 512 × 512 PNG runtime icon. This is an explicit artwork task; normal extension builds use the checked-in icon. Other concepts are preserved locally in the Git-ignored `.artwork-explorations/` directory. Promotional artwork is separate from actual Raycast screenshots.

## Generation and storage behavior

Counts are whole numbers within each command's range; surrounding whitespace is ignored. Clearing the field restores that command's configured default. Invalid input keeps the last valid preview visible and disables generation actions until the count is valid.

Each command session selects a stable random pool for each book. Changing the count shows a prefix of that book's pool; returning to a prior count restores the same text. **Regenerate** (`⌘R`) changes the selected book's pool. Launching a command starts a new session. Count input and generated output are not persisted by the extension.

Passages preserve source verse and dramatic speech line breaks. Output omits headers, stage directions, speaker names, notes, and line numbers. **Information** shows the selected book's edition, scope, license, and attribution, with links for selected and all bundled sections. Sentences are joined with spaces, except Chinese and Japanese use no added separator. Ordinary Copy and Paste omit attribution and source links. **Copy with Attribution** appends the selected book's credit, edition, license, modification note and selected source revisions.

The preview reports **Total characters** and **Total words** for the exact raw output, including blank lines and separators. Counts use ICU-backed `Intl.Segmenter`: words are word-like segments, and characters are grapheme clusters. Unsupported or malformed locale tags fall back to English. Statistics are informational and are not copied or pasted.

The four bundled sampled works—Fantine, Divina Commedia, Journey to the West, and Kokoro—have a budget of **101,461 UTF-8 passage-text bytes each** (about 100 kB, matching O Alienista). Sentence text is stored separately. All currently complete works, including Sub terra, are retained in full. Sampling preserves complete source units across the prepared sections without padding or truncation. The corpus metadata and source links record exact coverage. Unpunctuated complete verse units are retained as sentence excerpts without adding punctuation.

## Licensing and release checks

The root [MIT license](LICENSE) covers project software and documentation outside the corpus. [Corpus licensing](corpus/LICENSE.md) and [source notices](corpus/NOTICE.md) cover literary data separately. Historical source substitutions and outstanding edition questions are recorded in those notices and book metadata.

`corpus/LICENSE.md` and `assets/corpus-license.txt` must remain identical. Runtime assets ship with Raycast builds, including `ray develop`, so the corpus license is available without a release-only copy step. Distribution tests verify the license and packaged contents.

`npm run build` clears only repository-local `dist/` before compiling, preventing obsolete command maps from being distributed. It does not register or modify the installed extension. The explicit `BOOK_IDS` catalog in `scripts/build-corpus.mjs` selects the thirteen bundled books. Hindi and Russian prepared files and acquisition records remain development inputs only; they are excluded from the runtime database and settings.
