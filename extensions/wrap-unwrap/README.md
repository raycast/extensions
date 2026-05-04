# Wrap Unwrap

Reflow text to or from wrapped form, with Markdown awareness. Two `no-view` commands you can hotkey-bind:

- **Wrap Text** — wrap the selected text (or clipboard text) at a configurable column width.
- **Unwrap Text** — reflow wrapped text into continuous paragraphs, preserving Markdown structure (code fences, lists, blockquotes, tables, links, hyphenation).

The classifier recognizes paragraphs, ATX and setext headings, fenced and indented code, blockquotes (with nesting), bullet/ordered/task lists, pipe tables, HTML blocks, reference link definitions, and hard breaks. Unwrap groups by blockquote prefix and inner role, so `> - item` reflows as a list item under a quote without losing structure.

## Commands

| Command | Description |
| --- | --- |
| Wrap Text | Wrap text at a configurable column width. |
| Unwrap Text | Reflow wrapped text into continuous paragraphs while preserving Markdown structure. |

## Preferences

Both commands share **Preferred Source**, **Primary Action**, **Hide HUD**, and **Pop to Root After Action**:

| Preference | Default | What it does |
| --- | --- | --- |
| Preferred Source | Selected Text | Try the selection first; fall back to the clipboard if none. Choose Clipboard to flip the priority. |
| Primary Action | Paste | Paste the result into the focused app. Choose Copy to put the result on the clipboard instead. |
| Hide HUD | off | Suppress the success HUD ("Pasted wrapped text" / "Copied unwrapped text"). |
| Pop to Root After Action | off | Return to Raycast root after the action completes. (No-op when launched via hotkey.) |

**Wrap Text** also has:

| Preference | Default | What it does |
| --- | --- | --- |
| Wrap Column | 80 | The column at which lines are wrapped. The wrap budget is the _full_ line including blockquote and list-item prefixes. Width values below 20 are clamped to 20. |

**Unwrap Text** also has:

| Preference | Default | What it does |
| --- | --- | --- |
| Strip Soft Hyphens | on | When joining lines, remove a trailing hyphen if it appears to be a soft line-break hyphen (e.g. `inter-` + `esting` → `interesting`). Compounds like `state-of-the-art` are preserved. |
| Keep Blank Lines | off | Preserve blank lines between paragraphs instead of collapsing runs. |

## Suggested hotkeys

Bind these in Raycast → Extensions → Wrap Unwrap. Suggestions:

- Wrap Text → ⌃⌥W
- Unwrap Text → ⌃⌥U

## For other extensions

Wrap Unwrap implements the [LitoMore cross-extension convention](https://github.com/LitoMore/raycast-cross-extension-conventions) on the provider side using only built-in Raycast SDK primitives. Pass a `launchContext` with the text and an optional `callbackLaunchOptions` describing where to send the result:

```ts
import { LaunchType, launchCommand } from "@raycast/api";

await launchCommand({
  name: "unwrap-text",
  type: LaunchType.UserInitiated,
  extensionName: "wrap-unwrap",
  ownerOrAuthorName: "chrismessina",
  context: {
    text: "Some\nwrapped\ntext\nto reflow",
    hyphenation: true,
    callbackLaunchOptions: {
      name: "your-callback-command",
      type: LaunchType.Background,
      extensionName: "your-extension",
      ownerOrAuthorName: "you",
    },
  },
});
```

The provider invokes your callback command with `context: { result: "..." }` containing the transformed text. When `callbackLaunchOptions` is present, the provider does not paste, copy, or show a HUD — it just hands the result back.

`UnwrapContext` accepts `text`, `hyphenation`, `keepBlankLines`, and `callbackLaunchOptions`. `WrapContext` accepts `text`, `width`, and `callbackLaunchOptions`.

## Acknowledgements

The Preferred Source / Primary Action preference pattern follows the popular [Change Case](https://www.raycast.com/erics118/change-case) extension's convention.
