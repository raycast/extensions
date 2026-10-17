# Swiss Dummy Data

A Raycast extension that generates random data commonly found in Switzerland.
The data passes format and checksum validation.
It is meant for testing and demos.

## Commands

### Generate SSN

Generates a random Swiss Social Security Number, also known as _AHV-Nummer_ or _AHVN13_.
The number looks like `756.9217.0769.85`.

The [ZAS](https://www.zas.admin.ch/de/ahv-nummer-identifikator) defines the structure:

| Digits  | Content                                    |
| ------- | ------------------------------------------ |
| 1 to 3  | The prefix `756`, the ISO 3166 code of CH  |
| 4 to 12 | A random number between 0 and 999 999 999  |
| 13      | The EAN-13 check digit of the first twelve |

The nine random digits are drawn uniformly.
There is no official range of test numbers.
Therefore, a generated number may belong to a real person.
Never use generated numbers outside of test data.

## Actions

| Action              | Shortcut                           |
| ------------------- | ---------------------------------- |
| Copy to Clipboard   | `↵`                                |
| Paste in Active App | `⌘ ↵` (macOS), `⌃ ↵` (Windows)     |
| Copy Without Dots   | `⌘ ⇧ C` (macOS), `⌃ ⇧ C` (Windows) |
| Paste Without Dots  | `⌘ ⇧ V` (macOS), `⌃ ⇧ V` (Windows) |
| Generate New SSN    | `⌘ N` (macOS), `⌃ N` (Windows)     |
| Remove Entry        | `⌃ X`                              |
| Clear History       | `⌃ ⇧ X`                            |

The paste actions insert the value into the field that was active before Raycast opened.
They use the clipboard, so clipboard managers may record the value.

_Remove Entry_ and _Clear History_ are available on history entries.

## History

Previously generated values appear in a _History_ section below the new value.
The newest entry comes first.
Each command keeps its own history.

The extension preferences control the history:

- **History** turns the history on or off.
  It is on by default.
  When it is off, the next launch of any command deletes all stored entries.
- **History Size** sets how many previous values each command keeps.
  The default is 20.
  An empty or invalid value falls back to 20.
  `0` hides the history.

## Development

Install the dependencies:

```bash
npm install
```

Run the extension in Raycast:

```bash
npm run dev
```

Run the tests:

```bash
npm test
```

Run the linter:

```bash
npm run lint
```
