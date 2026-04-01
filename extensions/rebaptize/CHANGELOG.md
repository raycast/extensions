# Rebaptize Changelog

## [New Commands and Features] - {PR_MERGE_DATE}

### New Commands

- **Rename Photos by EXIF** — rename photos using date taken, camera model, ISO, focal length (template-based)
- **Rename from CSV** — bulk rename files using a mapping of old names to new names
- **Remove Accents from Filenames** — strip diacritics: café → cafe, über → uber
- **Strip Digits from Filenames** — remove all numbers from filenames
- **Strip Special Characters** — remove brackets, symbols, and special chars
- **Trim Filenames** — remove leading/trailing spaces, dashes, dots, underscores
- **Add Zero Padding to Numbers** — file1 → file001
- **Remove Zero Padding from Numbers** — file001 → file1
- **Prepend Parent Folder Name** — NYC/img.jpg → NYC - img.jpg
- **Swap Filename Parts** — swap around " - " separator: Artist - Song → Song - Artist
- **Transliterate to Latin** — convert Cyrillic, accented, and non-Latin characters to ASCII

### New Script Step Types

- All 11 new operations available as step types in Create Rename Script
- Insert at Position and Remove at Position steps for precise character manipulation

## [Enhanced Enumerate] - {PR_MERGE_DATE}

- Enumerate now preserves original filenames by default (e.g. `001-apple.txt` instead of `001.txt`)
- Add number format options: numeric with zero padding, uppercase alphabetic (A, B, C), lowercase alphabetic (a, b, c)
- Add number position option: before or after the original filename
- Add optional prefix and suffix fields
- Start number and zero padding are only shown for numeric format
- Instant enumerate commands (by name and by date) now also preserve original filenames
- Add Custom Template mode with up to 3 independent counters for advanced enumeration patterns
- Each counter has its own format (numeric/alphabetic), start value, zero padding, and increment frequency
- Template uses `{1}`, `{2}`, `{3}` for counters and `{name}` for the original filename
- Live preview shows first 3 resulting filenames in Custom Template mode

## [TMDB Support and Metadata Sources] - {PR_MERGE_DATE}

- Add TMDB (The Movie Database) as a free metadata source for Smart Organize Episodes
- Keep TheTVDB as an alternative for users with an existing subscription ($12/year)
- Users can choose between TMDB, TheTVDB, or manual mode per command run
- Clarify pricing in preferences and documentation

## [Custom Rename Scripts] - {PR_MERGE_DATE}

- Add Create Rename Script command to build reusable rename pipelines with file filters and chained steps
- Add Run Rename Script command to list and execute saved scripts
- Add Edit Script support from Run Rename Script (Cmd+E)

## [Instant Commands and Undo] - {PR_MERGE_DATE}

- Add 13 instant no-view commands for one-shot renames: case conversion, delimiter swaps, spacing, and enumeration
- Add Undo Last Rename command that reverts the last instant action within 5 minutes
- All instant commands run with no UI, directly against the current Finder folder

## [Presets as Standalone Commands] - {PR_MERGE_DATE}

- Add 9 preset shortcut commands: Rename as TV Show, Rename as Anime, Rename as Movie, Rename Sequentially, Rename by Date, Change Filename Case, Swap Filename Delimiter, Auto Enumerate Files, Change File Extension
- Each preset can be assigned its own alias or hotkey in Raycast

## [New Presets and Smart Features] - {PR_MERGE_DATE}

- Add Change Case preset with UPPERCASE, lowercase, Title Case, and Sentence case
- Add Swap Delimiter preset to replace any delimiter with another
- Add Auto Enumerate preset with sorting by name, date created, date modified, file size, or name length
- Add Change Extension preset for bulk file extension conversion
- Add custom word separator and suffix options for TV Show and Movie presets
- Add Smart Find & Replace command with up to 3 chained regex rules and file filters

## [Smart Detection and Finder Integration] - {PR_MERGE_DATE}

- All commands auto-detect the current Finder folder using getSelectedFinderItems and AppleScript fallback
- Smart file analysis auto-fills show names, season numbers, and suggests the best rename preset
- Proper title casing for auto-detected show names
- Show detected folder path as info text on all folder pickers

## [Smart Organize Episodes and Sort Commands] - {PR_MERGE_DATE}

- Add Smart Organize Episodes command with auto-detection of episode numbers from 9 filename patterns
- Add Sort Files by Date command to organize files into date-named folders (day, month, year)
- Add Sort Photos by Location command using EXIF GPS data and OpenStreetMap reverse geocoding
- Add metadata integration for automatic season and episode lookup (TMDB and TheTVDB)

## [Initial Release] - {PR_MERGE_DATE}

- Rebaptize Files command with presets for TV shows, anime, movies, sequential numbering, date-based, and find & replace
- Works with any file type
- Live preview before committing renames
