# Thesaurus Rex

Raycast extension: look up synonyms, antonyms and definitions for any word, copy or paste one into the frontmost app.

Fully offline. Nothing is sent anywhere — the dictionaries are downloaded once, on request, and every lookup after that runs on your Mac.

## First run

Run the **Manage Dictionaries** command and press ⏎ on the download action. It fetches the dictionary, verifies its SHA-256 and transforms it into a local SQLite database in the extension's support directory:

| Dictionary                                                    | Supplies                                                 | Download |
| ------------------------------------------------------------- | -------------------------------------------------------- | -------- |
| [Open English WordNet 2024](https://en-word.net/) (CC BY 4.0) | definitions, examples, synonyms, antonyms, pronunciation | 12.9 MB  |

Deletable at any time from the same command (⌃X). Until it is downloaded the extension has nothing to look words up in.

## Commands

**Look Up Word** shows definitions, then synonyms, then antonyms. **Search Synonyms**, **Search Antonyms** and **Define Word** each show one of those on its own. **Manage Dictionaries** downloads and deletes the data.

## Looking things up

- ⏎ copies the word, ⌘⏎ pastes it into the frontmost app.
- ⌘D opens a detail pane: the word with its IPA where WordNet has one, the definition in full and its example sentences. On a synonym or antonym row it shows what _that_ word means.
- The combined view shows 3 rows per section and the focused commands 25, with **Show N more** to expand. Synonyms are ranked by how many senses they share with the word you typed.
- Inflected forms fall back to their stem, so _running_ finds _run_ and _carries_ finds _carry_. The fallback only fires when the shortened form is really in the dictionary, so _bus_ never becomes _bu_.

## Attribution

Open English WordNet is © the Open English WordNet contributors, licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
