# Clipboard Case

A small Raycast extension: copy text, run a command, and paste it with different capitalization or cleaned-up whitespace.

| Command                       | Clipboard                   | Pasted text                 |
| ----------------------------- | --------------------------- | --------------------------- |
| **Paste as Lowercase**        | `HELLO World`               | `hello world`               |
| **Paste as Uppercase**        | `Hello world`               | `HELLO WORLD`               |
| **Paste as Sentence Case**    | `HELLO WORLD. HOW ARE YOU?` | `Hello world. How are you?` |
| **Paste as Title Case**       | `the quick brown fox`       | `The Quick Brown Fox`       |
| **Trim Whitespace and Paste** | `  Hello world  `           | `Hello world`               |
| **Paste as One Line**         | `Hello\n\tworld`            | `Hello world`               |

In the table, `\n` represents a line break and `\t` a tab.

## Install locally

Requires macOS, Raycast 2.13.1 or later, and Node.js 22.22.2 or later.

```sh
git clone https://github.com/pdaddyo/clipboard-case.git
cd clipboard-case
npm ci
npm run dev
```

Raycast imports the extension automatically. Once the first build finishes, you can stop the development process with `Ctrl+C`; the commands remain installed. Run `npm run dev` again after changing the code.

If you already have the source, run the last two commands inside its folder.

This repository is open source; the extension is not published in the Raycast Store.

## Use

1. Copy some text.
2. Put your cursor where you want it pasted.
3. Open Raycast and run **Paste as Lowercase** (or another case command).

For quick access, open **Raycast Settings → Extensions → Clipboard Case** and assign **Paste as Lowercase** a hotkey, such as `⌃⌥⌘V`, or an alias like `lc`. Choose an unused shortcut. With a hotkey, you can paste directly without opening Raycast first.

If pasting does not work, focus an editable field and check **System Settings → Privacy & Security → Accessibility → Raycast**.

## Behavior

- Reads the current clipboard only when you run a command, then uses Raycast's native paste API. It does not intercept ordinary `⌘V`.
- Pastes plain text; rich-text styling is discarded. The four case commands retain spaces, tabs, punctuation, and line breaks.
- Empty or non-text clipboards show a short message instead of pasting.
- All conversion runs locally. The extension has no network calls, AI, analytics, or clipboard logging. Raycast's own clipboard-history settings still apply.
- Lowercase and uppercase use JavaScript's standard Unicode case conversion. Some letters can expand into multiple characters, such as `ß` → `SS`.
- Title case capitalizes every word, including small words such as “the” and “of”. Apostrophes stay inside words (`DON'T` → `Don't`), and hyphenated parts are capitalized (`well-known` → `Well-Known`). It does not implement a particular editorial style guide.
- Sentence case lowercases the text, then capitalizes the first letter, the start of each line, and the first letter after `.`, `!`, or `?` followed by whitespace. It handles surrounding quotes, but does not identify proper names, acronyms, or abbreviations. For example, `NASA` becomes `Nasa` at the start of a sentence and `nasa` elsewhere.
- Trim Whitespace removes whitespace only from the start and end of the entire text, including surrounding blank lines. Internal spaces, tabs, and line breaks stay intact.
- Paste as One Line trims the edges and collapses each run of whitespace (including line breaks, tabs, and non-breaking spaces) to a single ordinary space. It preserves capitalization and punctuation.
- If whitespace cleanup leaves no text, the command shows a message and does not paste, preserving any selected text in the destination.

## Development

```sh
npm run check   # Type checking, tests, Raycast lint, and a local build
npm run dev     # Import into Raycast and watch for changes
npm run bundle  # Create a local .rayext archive
```

The shared clipboard flow is in `src/paste.ts`; the pure conversions are in `src/transforms.ts`. Each command has a small entry point so it can have its own hotkey.

The tests cover Unicode, punctuation, whitespace, command wiring, empty clipboards, and read/paste failures. They mock the Raycast API; actual pasting requires Raycast and an editable destination.

Possible small additions later: **snake_case / kebab-case**.

## Publish to the Raycast Store

Publishing is a review process through the public [`raycast/extensions`](https://github.com/raycast/extensions) GitHub repository. Pushing to this personal repository does not submit the extension to the Store.

1. Manually try all six commands in an editable text field, including an empty clipboard and whitespace-only text. Automated tests mock Raycast's clipboard API.
2. Review the [Store preparation guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store). This project already includes a custom 512×512 PNG icon, descriptions, a category, MIT license, README, and changelog. Screenshots can be added using Raycast's **Capture Window** command and **Save to Metadata** option; they should show the extension within Raycast, not another app.
3. From the extension folder, run:

   ```sh
   npm run check
   npm run publish
   ```

4. Follow the CLI's authentication prompts. The `author` is your Raycast handle, `paul_barrass`. The publisher authenticates with GitHub and opens a pull request to `raycast/extensions`.
5. Explain the clipboard-first, direct-paste workflow in the PR, respond to review comments, and run `npm run publish` again if you need to update the submission. Once Raycast accepts and merges the PR, it is automatically published in the Store.

Raycast's guidelines favor contributing to existing extensions when the functionality overlaps, so reviewers may suggest that route. Store acceptance is their decision.

The publish script uses Raycast's documented latest publisher. It is separate from local validation and has not been run for this project.

See the [official publishing guide](https://developers.raycast.com/basics/publish-an-extension).

API reference: [Raycast Clipboard API](https://developers.raycast.com/api-reference/clipboard), [local development](https://developers.raycast.com/basics/create-your-first-extension).

## License

MIT — see [LICENSE](LICENSE).
