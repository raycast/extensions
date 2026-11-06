# Spokenly Word Replacements

Manage recurring dictation corrections from Raycast using [Spokenly’s official CLI](https://spokenly.app/docs/macos/cli).

## What's new

- **Add Word Replacement** pre-fills the misheard word if you have it selected when you open the command.

- **Manage Word Replacements:** search original and replacement text, copy a replacement, copy a full JSON backup, add a correction, or remove a correction.
- **Add Word Replacement:** add literal text, comma-separated variants, or a regular expression, with timing before AI instructions, after them, or both. An empty replacement removes matched text.

## Setup

Install a current version of [Spokenly](https://spokenly.app/download), open **Settings → Install CLI**, and keep the app running. The supported installer may request your password to create its `/usr/local/bin/spokenly` symlink. This extension does not install the CLI or request administrator access.

By default the extension checks `/usr/local/bin/spokenly` and `/opt/homebrew/bin/spokenly`. Set an absolute CLI path in extension preferences if yours is elsewhere. The CLI must support `spokenly replacements list`, `add`, and `remove`.

The inspected official 2.30.9 app includes these CLI commands. The CLI first appeared in 2.18.13, but the vendor release notes do not establish the minimum version for replacement management.

## Behavior

Rules come from the app every time the list is loaded. The extension does not read or write Spokenly’s private preferences, transcript files, or credentials.

An add checks for an existing case-insensitive original and refuses to replace it silently. After a mutation, the extension reads the rules again before showing success. When the CLI returns `isRegex` and `timing`, their values are checked too. If those fields are missing, the toast verifies only the text and asks you to check matching and timing in Spokenly. A disabled saved rule is reported as an error.

Removal requires confirmation because the official CLI removes **every** rule whose original equals the given text, ignoring case. Copy a JSON backup first if you may want to restore the rules in Spokenly’s editor. Original or replacement values beginning with a dash cannot be added here because the vendor CLI interprets them as options; use the app editor for those.

## Existing extension

The [existing Spokenly Store extension](https://www.raycast.com/mattiacolombomc/spokenly) covers dictation, history, file transcription, models, and quick commands. This package focuses on the supported word replacement commands missing from that extension. Its manifest name is `spokenly-word-replacements` to avoid colliding with the existing `spokenly` package.

## Development

Run `npm ci`, then `npm run dev`. Automated checks are `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test`. Tests use disposable local executable fixtures; they do not prove the real app’s integration.
