<p align="center">
  <img src="assets/icon.png" width="128" height="128" alt="Rebaptize icon" />
</p>

# Rebaptize

Bulk rename and organize files directly from Raycast. 30 commands covering everything from instant one-shot case conversion to smart TV show episode organization with metadata from TMDB and TheTVDB.

Every function is its own Raycast command — assign aliases and hotkeys to the ones you use most. All commands auto-detect the current Finder folder.

## Table of Contents

- [Getting Started](#getting-started)
- [Rename Files](#rename-files) — TV Show, Anime, Movie, Sequential, Date-Based, Change Case, Swap Delimiter, Auto Enumerate, Change Extension, Find & Replace
  - [Custom Template Mode](#custom-template-mode)
- [Smart Organize Episodes](#smart-organize-episodes)
- [Smart Find & Replace](#smart-find--replace)
- [Sort Files by Date](#sort-files-by-date)
- [Sort Photos by Location](#sort-photos-by-location)
- [Rename Photos by EXIF](#rename-photos-by-exif)
- [Rename from CSV](#rename-from-csv)
- [Custom Rename Scripts](#custom-rename-scripts)
- [Preset Shortcuts](#preset-shortcuts)
- [Instant Commands](#instant-commands) — Case, Delimiter, Clean Up, Utility, Undo
- [Smart Detection](#smart-detection)
- [Finder Detection](#finder-detection)
- [Metadata Integration](#metadata-integration-optional) — TMDB, TheTVDB
- [Tips](#tips)

## Getting Started

1. Install from the Raycast Store
2. Open a Finder window to the folder you want to work with
3. Open Raycast and search for any command (e.g. "Rename Files", "Smart Organize Episodes")

No additional setup required. To enable online metadata lookup for episode organizing, see [Metadata Integration](#metadata-integration-optional).

---

## Rename Files

The main command. Select a preset, configure options, preview all renames, then confirm. Smart detection analyzes the folder on launch and auto-suggests the best preset, auto-fills show names and season numbers.

### TV Show

Rename into standard `S01E01` format.

```
Before                                           After
breaking.bad.s01e01.720p.BluRay.x264-DEMAND.mkv  Breaking Bad S01E01.mkv
breaking.bad.s01e02.720p.BluRay.x264-DEMAND.mkv  Breaking Bad S01E02.mkv
Breaking.Bad.S01E03.HDTV.XviD-LOL.avi            Breaking Bad S01E03.avi
```

| Option                                | Description                                                                                                                 | Default                      |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Show Name                             | Name of the show (required)                                                                                                 | Auto-detected from filenames |
| Override season/episode               | When off, preserves existing `S01E01` info from filenames. When on, forces all files to the season and start episode below. | Off                          |
| Season / Default Season               | Season number. When override is off, only used for files without season info.                                               | `1`                          |
| Start Episode / Default Start Episode | First episode number. When override is off, only used for files without episode info.                                       | `1`                          |
| Word Separator                        | Space, Dot, Underscore, Dash, or Custom                                                                                     | Space                        |
| Custom Separator                      | Any string (shown when Custom is selected)                                                                                  | —                            |
| Suffix                                | Text added after `S01E01` (e.g. `1080p`, `PROPER`)                                                                          | —                            |

### Anime

Fansub convention with optional sub group and quality tags.

```
Before       After
001.mkv      [SubsPlease] Demon Slayer - 01 [1080p].mkv
002.mkv      [SubsPlease] Demon Slayer - 02 [1080p].mkv
003.mkv      [SubsPlease] Demon Slayer - 03 [1080p].mkv
```

| Option        | Description                          | Default                      |
| ------------- | ------------------------------------ | ---------------------------- |
| Anime Name    | Name of the anime (required)         | Auto-detected from filenames |
| Start Episode | First episode number                 | `1`                          |
| Sub Group     | Fansub group name (optional)         | —                            |
| Quality       | Quality tag (optional, e.g. `1080p`) | —                            |

### Movie

Standard movie format with year and quality.

```
Before                              After
Interstellar 2014 1080p BluRay.mkv  Interstellar 2014 1080p.mkv
The_Dark_Knight_2008_720p.mp4       Interstellar 2014 1080p.mp4
inception.2010.brrip.x264.mkv      Interstellar 2014 1080p.mkv
```

Note: All files in the folder are renamed to the same movie name you provide.

| Option         | Description                             | Default                      |
| -------------- | --------------------------------------- | ---------------------------- |
| Movie Name     | Name of the movie (required)            | Auto-detected from filenames |
| Year           | Release year (optional)                 | —                            |
| Quality        | Quality tag (optional, e.g. `1080p`)    | —                            |
| Word Separator | Space, Dot, Underscore, Dash, or Custom | Space                        |

### Sequential

Prefix with incrementing number.

```
Before           After
IMG_0001.jpg     Beach-Trip-001.jpg
IMG_0002.jpg     Beach-Trip-002.jpg
DSC_3345.jpg     Beach-Trip-003.jpg
```

| Option       | Description                       | Default |
| ------------ | --------------------------------- | ------- |
| Prefix       | Text before the number (required) | —       |
| Start Number | First number                      | `1`     |
| Zero Padding | Number of digits (e.g. 3 = `001`) | `3`     |
| Separator    | Dash, Underscore, Dot, or Space   | Dash    |

### Date-Based

Rename using file creation date.

```
Before           After
IMG_0001.jpg     Lisbon-2025-01-15_09-00-00-001.jpg
IMG_0002.jpg     Lisbon-2025-01-15_14-00-00-002.jpg
```

| Option      | Description                                 | Default      |
| ----------- | ------------------------------------------- | ------------ |
| Date Format | `YYYY-MM-DD`, `DD-MM-YYYY`, or `MM-DD-YYYY` | `YYYY-MM-DD` |
| Prefix      | Text before the date (optional)             | —            |

Uses the file's creation date. Falls back to modification date if creation date is unavailable.

### Change Case

Convert filename casing. Also collapses double/triple spaces into single spaces by default.

```
Title Case:     my show name.mkv         →  My Show Name.mkv
UPPERCASE:      my show name.mkv         →  MY SHOW NAME.mkv
lowercase:      My Show Name.mkv         →  my show name.mkv
Sentence case:  MY SHOW NAME.mkv         →  My show name.mkv
```

| Option                   | Description                                        | Default    |
| ------------------------ | -------------------------------------------------- | ---------- |
| Case                     | Title Case, UPPERCASE, lowercase, or Sentence case | Title Case |
| Collapse multiple spaces | Merge extra spaces into one                        | On         |

Title Case keeps common words lowercase (a, an, the, and, but, or, for, in, on, at, to, by, of, etc.) unless they are the first word.

### Swap Delimiter

Replace one delimiter character with another across all filenames. Extension is preserved.

```
Dots to spaces:          My.Show.S01E01.720p.mkv   →  My Show S01E01 720p.mkv
Spaces to underscores:   My Show S01E01.mkv         →  My_Show_S01E01.mkv
Underscores to dashes:   my_vacation_photo.jpg      →  my-vacation-photo.jpg
```

| Option | Description              | Default     |
| ------ | ------------------------ | ----------- |
| From   | Character(s) to find     | `.`         |
| To     | Replacement character(s) | ` ` (space) |

### Auto Enumerate

Number files sequentially. By default, the number is prepended to the original filename. The sort order controls which file gets which number.

```
Keep name (before):   apple.txt → 001-apple.txt, banana.txt → 002-banana.txt
Keep name (after):    apple.txt → apple-001.txt, banana.txt → banana-002.txt
Replace name:         apple.txt → 001.txt, banana.txt → 002.txt
Alphabetic:           apple.txt → A-apple.txt, banana.txt → B-banana.txt
With prefix:          apple.txt → photo-001-apple.txt
With suffix:          apple.txt → 001-apple-final.txt
```

| Option                 | Description                                                             | Default   |
| ---------------------- | ----------------------------------------------------------------------- | --------- |
| Keep Original Filename | Prepend/append number to original name instead of replacing it          | On        |
| Number Position        | Before Name or After Name (shown when Keep Original Filename is on)     | Before    |
| Number Format          | Numeric (001), Alphabetic A, B, C, or Alphabetic a, b, c                | Numeric   |
| Prefix                 | Text before the number (optional)                                       | --        |
| Suffix                 | Text after the name (optional)                                          | --        |
| Start Number           | First number (numeric format only)                                      | `1`       |
| Zero Padding           | Number of digits (numeric format only)                                  | `3`       |
| Separator              | Dash, Underscore, Dot, or Space                                         | Dash      |
| Sort Files By          | File Name (A-Z), Date Created, Date Modified, File Size, or Name Length | File Name |

#### Custom Template Mode

Toggle **Custom Template** on for advanced patterns with multiple independent counters. Write a template using placeholders and configure up to 3 counters, each with its own format, start value, padding, and increment frequency.

**Template placeholders:**

- `{1}`, `{2}`, `{3}` -- counter references
- `{name}` -- original filename (without extension)
- Extension is added automatically

**Counter options (up to 3):**

| Option          | Description                                                  | Default |
| --------------- | ------------------------------------------------------------ | ------- |
| Format          | Numeric (1, 2, 3), Alphabetic A, B, C, or Alphabetic a, b, c | Numeric |
| Start           | Starting value                                               | `1`     |
| Zero Padding    | Number of digits (numeric only, 0 = no padding)              | `0`     |
| Increment Every | How many files before incrementing (1 = every file)          | `1`     |

**Examples:**

```
Template: {1} - {name}
  Counter {1}: numeric, every 1
  → 1 - apple.txt, 2 - banana.txt, 3 - cherry.txt

Template: {1}_{name}_{2}
  Counter {1}: numeric, every 1
  Counter {2}: numeric, every 3
  → 1_apple_1.txt, 2_banana_1.txt, 3_cherry_1.txt, 4_donut_2.txt, 5_eclair_2.txt

Template: {1}{2} - {name}
  Counter {1}: alpha-upper, every 3
  Counter {2}: numeric, pad 2, every 1
  → A01 - apple.txt, A02 - banana.txt, A03 - cherry.txt, B04 - donut.txt
```

The preview shows the first 3 resulting filenames so you can verify the pattern before applying.

### Change Extension

Bulk convert file extensions. Optionally filter to only change files with a specific current extension.

```
*.jpeg → *.jpg
*.txt  → *.md
```

| Option         | Description                                                 | Default |
| -------------- | ----------------------------------------------------------- | ------- |
| From Extension | Only change files with this extension (leave empty for all) | —       |
| New Extension  | The target extension (required)                             | —       |

### Find & Replace

Plain text or regex find and replace on filenames. Extension is preserved by default.

```
Remove quality tags:  My.Show.S01E01.720p.BluRay.x264-GROUP.mkv  →  My.Show.S01E01.mkv
```

| Option                 | Description                                                         | Default |
| ---------------------- | ------------------------------------------------------------------- | ------- |
| Find                   | Pattern to search for                                               | —       |
| Replace With           | Replacement text (supports `$1`, `$2` capture groups in regex mode) | —       |
| Use Regular Expression | Toggle regex mode                                                   | Off     |

---

## Smart Organize Episodes

Auto-detect episode numbers from filenames and organize into season folders with proper naming.

```
Before (flat folder):         After:
001.mkv                       Season 01/Demon.Slayer.S01E01.mkv
002.mkv                       Season 01/Demon.Slayer.S01E02.mkv
...                           ...
026.mkv                       Season 02/Demon.Slayer.S02E13.mkv
```

### Supported Filename Patterns

The episode parser recognizes 9 different formats:

| Pattern              | Example                                                 |
| -------------------- | ------------------------------------------------------- |
| Standard TV          | `S01E01`, `s01e01`, `S1E5`                              |
| Cross-format         | `1x01`, `01x05`                                         |
| Anime fansub         | `[SubsPlease] Show Name - 01 [1080p]`                   |
| E-only               | `Show.Name.E01`, `Show Name - E01`                      |
| Verbose              | `Episode 01`, `Ep 01`, `EP01`                           |
| Bare after separator | `Show Name - 001`                                       |
| Pure numeric         | `001.mkv` (entire filename minus extension is a number) |
| Leading number       | `01 - Title.mkv`, `001 Something.mkv`                   |
| Trailing number      | `Something_01.mkv`                                      |

### Options

| Option             | Description                                                                                         | Default                                     |
| ------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Show / Anime Name  | Name used in output filenames (required)                                                            | Auto-detected from filenames or folder name |
| Metadata Source    | Manual, TMDB (free), or TheTVDB ($12/year)                                                          | Manual                                      |
| Season Episodes    | Per-season episode counts (Manual mode only). Press `Cmd+N` to add seasons, `Cmd+Delete` to remove. | Season 1: 12                                |
| Start season at 00 | When enabled, first season is numbered 00 instead of 01                                             | Off                                         |
| Folder Template    | Output folder name pattern                                                                          | `Season {season}`                           |
| File Template      | Output filename pattern (extension added automatically)                                             | `{show}.S{season}E{episode}`                |

**Template variables:** `{show}`, `{season}` (zero-padded), `{episode}` (zero-padded)

### Season Configuration (Manual Mode)

In manual mode, each season has its own episode count field. Not all shows have the same number of episodes per season — for example Breaking Bad has 7, 13, 13, 13, and 16 episodes across its 5 seasons.

```
Season 1 Episodes: [7 ]
Season 2 Episodes: [13]
Season 3 Episodes: [13]
Season 4 Episodes: [13]
Season 5 Episodes: [16]
```

Press `Cmd+N` to add a season, `Cmd+Delete` to remove the last one. When a TMDB or TheTVDB key is configured, these fields are replaced by automatic lookup.

### Season Detection

- If filenames already contain season info (`S01E01`, `1x01`), those season numbers are used directly
- Otherwise, flat episode numbers (1, 2, ... 50) are split according to the per-season episode counts
- With TMDB or TheTVDB, the real season/episode breakdown is fetched automatically
- If the API fetch fails, it falls back to manual splitting
- Files that can't be parsed are skipped and left untouched

---

## Smart Find & Replace

Multi-rule find and replace for filenames. More powerful than the basic Find & Replace preset.

```
Folder contents:                                     File filter: *.mkv
My.Show.S01E01.720p.BluRay.x264-GROUP.mkv            Rule 1: \.720p\.BluRay.*?-\w+  →  (empty)  [regex]
My.Show.S01E02.720p.BluRay.x264-GROUP.mkv            Rule 2: \.1080p.*$  →  (empty)  [regex]
My.Show.S01E03.1080p.HDTV.x264-FLEET.mkv
notes.txt  (filtered out — not *.mkv)                 Result: My.Show.S01E01.mkv, My.Show.S01E02.mkv, ...
```

| Option                       | Description                                                                    | Default       |
| ---------------------------- | ------------------------------------------------------------------------------ | ------------- |
| File Filter                  | Glob pattern to target specific files (e.g. `*.mkv`, `*.{mkv,mp4}`, `photo_*`) | — (all files) |
| Include file extension       | Whether find/replace operates on the extension too                             | Off           |
| Rule 1-3: Find               | Pattern to search for                                                          | —             |
| Rule 1-3: Replace            | Replacement text (supports `$1`, `$2` in regex mode)                           | —             |
| Rule 1-3: Regular Expression | Toggle regex mode per rule                                                     | Off           |
| Rule 1-3: Case Sensitive     | Toggle case sensitivity per rule                                               | On            |

Rules are applied in sequence: Rule 1 output feeds into Rule 2, which feeds into Rule 3. The form includes a live preview and regex tips.

---

## Sort Files by Date

Organize files into subfolders by creation date. Works with any file type.

```
Before (flat folder):        After (grouped by month):
IMG_0001.jpg (Jan 15)        2025-01/IMG_0001.jpg
IMG_0002.jpg (Jan 15)        2025-01/IMG_0002.jpg
IMG_0003.jpg (Feb 20)        2025-02/IMG_0003.jpg
IMG_0004.jpg (Mar 10)        2025-03/IMG_0004.jpg
```

| Option      | Description                                             | Default |
| ----------- | ------------------------------------------------------- | ------- |
| Group By    | Day (`2025-01-15`), Month (`2025-01`), or Year (`2025`) | Month   |
| File Action | Move or Copy files                                      | Move    |

Uses file creation date. Falls back to modification date if creation date is unavailable.

---

## Sort Photos by Location

Organize photos into subfolders by GPS data embedded in EXIF metadata. Uses OpenStreetMap Nominatim for reverse geocoding — no API key required.

```
Before:                After (by city):
IMG_1001.jpg (Lisbon)  Lisbon/IMG_1001.jpg
IMG_1002.jpg (Lisbon)  Lisbon/IMG_1002.jpg
IMG_1003.jpg (Tokyo)   Tokyo/IMG_1003.jpg
IMG_1004.jpg (no GPS)  (stays in original folder)
```

| Option      | Description                    | Default |
| ----------- | ------------------------------ | ------- |
| Group By    | City, State/Region, or Country | City    |
| File Action | Move or Copy files             | Move    |

City resolution uses a fallback chain: city → town → village → municipality → county.

Nearby photos share geocoding results via an internal cache (~1km precision for city, ~10km for state, ~100km for country). Requests are rate-limited to 1 per second per Nominatim's usage policy.

**Supported formats:** JPEG (`.jpg`, `.jpeg`), TIFF (`.tiff`, `.tif`), HEIC (`.heic`, `.heif`), DNG, Canon CR2, Nikon NEF, Sony ARW, Olympus ORF, Panasonic RW2.

Photos without GPS data are shown in the preview but left untouched during organize.

---

## Rename Photos by EXIF

Rename photos using embedded EXIF metadata -- date taken, camera make/model, ISO, focal length, and resolution.

**Template placeholders:**

- `{date}` -- date taken (format configurable)
- `{make}` -- camera manufacturer (Canon, Nikon, etc.)
- `{model}` -- camera model (EOS R5, Z9, etc.)
- `{iso}` -- ISO speed
- `{focal}` -- focal length (e.g. 85mm)
- `{width}`, `{height}` -- image dimensions
- `{name}` -- original filename
- `{i}` -- index (001, 002, etc.)

**Date formats:** `2026-03-31_14-30-00`, `2026-03-31`, `20260331`, `31-03-2026`

```
Template: {date}_{i}         → 2026-03-31_14-30-00_001.jpg
Template: {model}_{date}_{i} → EOS R5_2026-03-31_001.jpg
Template: {date}_{name}      → 2026-03-31_DSC_0001.jpg
```

Files are automatically sorted by EXIF date taken. Supports JPEG, TIFF, HEIC, RAW (ARW, CR2, NEF, DNG), and more.

---

## Rename from CSV

Rename files using a mapping of old names to new names. Paste the mappings directly or copy from a spreadsheet.

**Supported separators:** Comma, Tab, Semicolon, Pipe, Arrow (`->`)

```
old-name.txt,new-name.txt
photo.jpg,vacation-001.jpg
report.pdf,Q1-2026-report.pdf
```

Files that don't exist in the folder are skipped with a warning. Preview is shown before any changes are applied.

---

## Custom Rename Scripts

Build reusable rename pipelines that combine a file filter with a sequence of rename steps. Save them and run later with a single action.

### Create Rename Script

1. Open Raycast → search **"Create Rename Script"**
2. Press `Enter` on the script info item to set:
   - **Script Name** — a descriptive name (e.g. "Clean MKV for Plex")
   - **Description** — what the script does
   - **File Filter** — glob pattern to target specific files (e.g. `*.mkv`, leave empty for all files)
3. Add steps to the pipeline — each step transforms the filename and passes the result to the next step

**Available step types (13):**

| Category      | Step Types                                                                               |
| ------------- | ---------------------------------------------------------------------------------------- |
| Case          | UPPERCASE, lowercase, Title Case, Sentence Case                                          |
| Clean Up      | Collapse Multiple Spaces, Swap Delimiter, Find & Replace, Change Extension               |
| Rename Format | Rename as TV Show, Rename as Anime, Rename as Movie, Rename Sequentially, Auto Enumerate |

Each step type has the same configuration options as its corresponding preset in the Rename Files command. The TV Show and Anime steps auto-detect episode numbers from the current filename (after previous steps have been applied).

**Keyboard shortcuts in the script builder:**

| Shortcut                   | Action                                |
| -------------------------- | ------------------------------------- |
| `Enter`                    | Edit selected step                    |
| `Cmd + N`                  | Add new step                          |
| `Cmd + Shift + Up Arrow`   | Move step up                          |
| `Cmd + Shift + Down Arrow` | Move step down                        |
| `Cmd + Backspace`          | Remove step                           |
| `Cmd + Shift + P`          | Preview against current Finder folder |
| `Cmd + S`                  | Save script                           |

**Example pipeline** — clean up messy TV downloads:

1. **Filter:** `*.mkv`
2. **Step 1:** Swap Delimiter `.` → ` ` (dots to spaces)
3. **Step 2:** Title Case
4. **Step 3:** Rename as TV Show (Breaking Bad, S01, start E01)

Result: `breaking.bad.s01e01.720p.bluray.mkv` → `Breaking Bad S01E01.mkv`

### Run Rename Script

1. Open Raycast → search **"Run Rename Script"**
2. Select a saved script from the list
3. Press `Enter` to run — shows a preview of all renames before confirming

The script list shows each script's name, description, file filter, and step count. Scripts are stored persistently and survive Raycast restarts.

| Shortcut               | Action                    |
| ---------------------- | ------------------------- |
| `Enter`                | Run script (with preview) |
| `Cmd + E`              | Edit script               |
| `Cmd + K` → View Steps | View the pipeline         |
| `Cmd + Backspace`      | Delete script             |

After running a script, undo state is saved — use **Undo Last Rename** to revert.

---

## Preset Shortcuts

Each preset from Rename Files is also available as a standalone command for direct access. These open the same form but pre-select the preset — useful for assigning aliases.

| Command                 | Output Format                                      |
| ----------------------- | -------------------------------------------------- |
| Rename as TV Show       | `Show Name S01E01.ext`                             |
| Rename as Anime         | `[Group] Name - 01 [Quality].ext`                  |
| Rename as Movie         | `Name Year Quality.ext`                            |
| Rename Sequentially     | `Prefix-001.ext`                                   |
| Rename by Date          | `Prefix-2025-01-15_09-00-00-001.ext`               |
| Change Filename Case    | UPPERCASE / lowercase / Title Case / Sentence case |
| Swap Filename Delimiter | Replace any delimiter with another                 |
| Auto Enumerate Files    | Number files by name, date, size, or name length   |
| Change File Extension   | `.jpeg` to `.jpg`, `.txt` to `.md`                 |

---

## Instant Commands

Zero-UI commands that execute immediately against the current Finder folder. No forms, no preview, no clicks — just a confirmation HUD. Every instant command saves undo state.

### Case Conversion

All case commands also collapse multiple spaces into single spaces automatically.

| Command                     | Example                                           |
| --------------------------- | ------------------------------------------------- |
| Uppercase All Filenames     | `my vacation photo.jpg` → `MY VACATION PHOTO.jpg` |
| Lowercase All Filenames     | `My Vacation PHOTO.jpg` → `my vacation photo.jpg` |
| Title Case All Filenames    | `my vacation photo.jpg` → `My Vacation Photo.jpg` |
| Sentence Case All Filenames | `MY VACATION PHOTO.jpg` → `My vacation photo.jpg` |

### Delimiter Conversion

| Command                         | Example                                     |
| ------------------------------- | ------------------------------------------- |
| Replace Dots with Spaces        | `My.Show.S01E01.mkv` → `My Show S01E01.mkv` |
| Replace Spaces with Dots        | `My Show.mkv` → `My.Show.mkv`               |
| Replace Underscores with Spaces | `my_file.jpg` → `my file.jpg`               |
| Replace Spaces with Underscores | `my file.jpg` → `my_file.jpg`               |
| Replace Dashes with Spaces      | `my-file.jpg` → `my file.jpg`               |
| Replace Spaces with Dashes      | `my file.jpg` → `my-file.jpg`               |

### Clean Up

| Command                       | Example                                   |
| ----------------------------- | ----------------------------------------- |
| Remove Accents from Filenames | `café résumé.txt` → `cafe resume.txt`     |
| Strip Digits from Filenames   | `file123name456.txt` → `filename.txt`     |
| Strip Special Characters      | `file (copy) [2].txt` → `file copy 2.txt` |
| Trim Filenames                | ` - file - .txt` → `file.txt`             |
| Transliterate to Latin        | `Москва.txt` → `Moskva.txt`               |

### Utility

| Command                          | Example                                           |
| -------------------------------- | ------------------------------------------------- |
| Collapse Multiple Spaces         | `my   show  name.mkv` → `my show name.mkv`        |
| Enumerate Files by Name          | Alphabetical → `1 - apple.ext`, `2 - banana.ext`  |
| Enumerate Files by Date Created  | Oldest first → `1 - oldest.ext`, `2 - middle.ext` |
| Add Zero Padding to Numbers      | `file1.txt` → `file001.txt`                       |
| Remove Zero Padding from Numbers | `file001.txt` → `file1.txt`                       |
| Prepend Parent Folder Name       | In folder `NYC`: `img.jpg` → `NYC - img.jpg`      |
| Swap Filename Parts              | `Artist - Song.mp3` → `Song - Artist.mp3`         |

Enumerate commands prepend the number to the original filename. Enumerate by Date uses creation date, falling back to modification date.

### Undo

| Command          | Description                                                                                                |
| ---------------- | ---------------------------------------------------------------------------------------------------------- |
| Undo Last Rename | Reverts the last rename or organize operation. Available within 5 minutes. Single use — cannot undo twice. |

Every command in Rebaptize saves undo state — including Rename Files, Smart Organize Episodes, Smart Find & Replace, Sort Files by Date, Sort Photos by Location, Run Rename Script, and all instant commands. For organize commands that move files into subfolders, undo moves them back and cleans up the empty folders.

---

## Smart Detection

When you open Rename Files or Smart Organize Episodes, the extension analyzes the files in the folder and auto-fills fields:

- **Show name** — detected from the most common filename prefix, parsed episode data, or the folder name as a last resort (excluding system folders like Downloads, Desktop, Documents)
- **Preset suggestion** — if most files look like TV episodes, selects TV Show; if they match anime fansub format, selects Anime; if they contain year + quality keywords, selects Movie; otherwise defaults to Sequential
- **Season numbers** — extracted from `SxxExx` patterns in filenames. If multiple seasons are detected, suggests using Smart Organize Episodes instead
- **Episodes per season** — estimated from the number of episodes per detected season
- **Confidence score** — shown in the Smart Detection note at the top of the form

All auto-filled values can be overridden manually.

---

## Finder Detection

All commands auto-detect the current Finder folder using two strategies:

1. **Selected items** — if files or folders are selected in Finder, uses the selected folder (or the parent folder of a selected file)
2. **Frontmost window** — falls back to AppleScript to get the path of the frontmost Finder window

If Finder is not open or no folder can be determined, the folder picker is shown empty for manual selection. The detected folder path is shown as info text beneath the folder picker.

---

## Metadata Integration (Optional)

Smart Organize Episodes can fetch real season and episode data from online databases so you don't need to manually set episodes-per-season. Two sources are supported:

### TMDB (Free)

[The Movie Database](https://www.themoviedb.org/) — completely free, excellent anime and TV coverage.

1. Create a free account at [themoviedb.org](https://www.themoviedb.org/signup)
2. Go to [Settings → API](https://www.themoviedb.org/settings/api) and request an API key (use the "API Key" / v3 auth key, not the Read Access Token)
3. Open Raycast Preferences → Extensions → Rebaptize → paste the key in **TMDB API Key (Free)**

### TheTVDB ($12/year)

[TheTVDB](https://thetvdb.com) — the classic TV metadata source, requires a paid subscription.

1. Subscribe at [thetvdb.com/subscribe](https://thetvdb.com/subscribe) ($12/year)
2. Get an API key from your [dashboard](https://www.thetvdb.com/dashboard/account/apikey)
3. Open Raycast Preferences → Extensions → Rebaptize → paste the key in **TheTVDB API Key**

When using a metadata source, type a show name and a dropdown appears with up to 5 search results (name + year). Select the correct show and the extension fetches the full season/episode breakdown. Specials (Season 0) are filtered out automatically.

If both keys are configured, you can choose which source to use per command run. Without either key, everything still works — you set the episodes-per-season count manually.

---

## Tips

- **Aliases:** Search any command → `Cmd + K` → Configure Command → set an alias (e.g. `tv` for Rename as TV Show, `undo` for Undo Last Rename)
- **Hotkeys:** Same menu — assign a global keyboard shortcut to any command
- **Finder:** All commands auto-detect the current Finder folder. Navigate to the right folder before invoking.
- **Undo:** Every rename and organize command is undoable. Run Undo Last Rename within 5 minutes to revert.
- **Scripts:** Build reusable rename pipelines with Create Rename Script. Run them from Run Rename Script. Assign an alias to Run Rename Script (e.g. `rs`) for quick access.
- **File filter:** Use glob patterns to target specific files: `*.mkv`, `*.{mkv,mp4}`, `photo_*`, `*.jpg, *.png` (comma-separated)
