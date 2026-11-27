# RedBison

[RedBison](https://redbison.dev) is a collection of free browser tools: calculators, unit converters, checklists and developer utilities, with no sign-up. This extension brings it into Raycast.

## Commands

**Search Tools** lists every tool on redbison.dev (759 at release) with its category and a one-line description, filterable by category. Enter opens the tool in your browser; there are actions to copy its URL, copy a Markdown link, or open its guide.

**Run Utility** runs one of 97 developer utilities on the selected text, or on the clipboard when nothing is selected, and shows the answer with actions to copy it or paste it into the app you came from. Among them:

- JSON: format, minify, validate, sort keys, tree view, to and from CSV, YAML and query strings
- Encoding: Base64, URL, HTML entities, hex, binary, Morse, NATO alphabet, ROT13
- Hashing: SHA-256, SHA-512, SHA-384, SHA-1 and MD5 digests, HMAC, digest comparison, JWT decoding
- Text: case conversion, sort, de-duplicate, reverse, shuffle, number, trim and wrap lines, word count, readability, line diff, regex test
- Generators: UUID (v4 and v7), passwords, lorem ipsum, test names, emails and numbers
- Formatting and inspection: SQL, XML, HTML and YAML beautifiers, cron checks, subnet and IP conversion, chmod, epoch timestamps, time zones, colors, contrast, thread dumps, GC logs, HAR files, protobuf, MessagePack and CBOR

Tools with settings (indent, hash algorithm, UUID version and so on) open a form with **Run with Options** (⌘E). **Try the Example** (⌘T) runs a recorded sample input, and **Copy CLI Command** gives the same run as a [`redbison`](https://redbison.dev/cli) terminal command.

**Format Clipboard JSON** pretty-prints the JSON on your clipboard with two-space indentation and copies it back, without opening a window. Give it a hotkey and it becomes a one-key formatter.

## Privacy

Run Utility and Format Clipboard JSON run entirely on your computer. Your text is never sent anywhere: utilities that need a server on redbison.dev are left out of this extension rather than called.

Search Tools ships with the tool list built in and refreshes it from the public file at `https://redbison.dev/ai-tools.json`. That request carries nothing about you or your searches.

No account, no API key, no analytics.

## Reading the selection

Run Utility reads the selected text through Raycast, which needs macOS Accessibility permission for Raycast. Without it, or when nothing is selected, the command uses the clipboard instead and says so in the search bar.

## Same answers everywhere

The utilities are the same code as the [redbison CLI](https://www.npmjs.com/package/@redbison/cli) and the RedBison plugins for VS Code and JetBrains IDEs, copied unchanged from the [RedBison repository](https://github.com/redbison-dev/redbison-tools) and tested against the same table of 370 behavior cases. JSON formatted here is formatted the way the terminal and the editor format it.
