# On-Device Writing Tools

Apple Intelligence writing actions on the selected text, in any app. Select text, run a command, and the result replaces the selection.

Runs the on-device Apple Intelligence model directly through Apple's Foundation Models framework. It doesn't click menus or the Writing Tools panel, so it keeps working when Apple changes that UI, as it did in macOS 27. Text never leaves your Mac.

## Requirements

- macOS 26 or later on Apple silicon
- Apple Intelligence turned on (System Settings → Apple Intelligence & Siri), with its models downloaded

## Commands

| Command | What it does |
| --- | --- |
| Proofread | Fixes spelling, grammar and punctuation |
| Rewrite | Rewrites for clarity, same meaning and tone |
| Make Friendly / Make Professional | Changes the tone |
| Make Concise | Shortens the text |
| Summarize / Create Key Points | Replaces the text with a summary or a bulleted list of key points |
| Make List / Make Table | Reformats the text as a list or a Markdown table |
| Edit with Instruction | Applies your own instruction, e.g. "translate to English" |

The output stays in the language of the selected text. Undo with ⌘Z if you want the original back.

## Development

Native code lives in the Swift package at `swift/writing-tools` and is exposed to TypeScript with `@raycast` through [Swift for Raycast Extensions](https://github.com/raycast/extensions-swift-tools). `npm run dev` and `npm run build` compile it; Xcode 16.3 or later is required.
