# AI Web Chat Launcher

<img src="assets/extension-icon.png" alt="AI Web Chat Launcher" width="96" height="96" />

Start a chat on the Claude, ChatGPT, Gemini, or Grok website with a prompt you type in Raycast or text from your clipboard.

Chats open in Google Chrome. Review your prompt in the chat box before sending
it. No API key is needed.

## Commands and shortcuts

| Destination | Open or type a query | Fill from clipboard |
| --- | --- | --- |
| Claude | `cla` — Open Claude | `cla c` — Open Claude with Clipboard |
| Gemini | `gem` — Open Gemini | `gem c` — Open Gemini with Clipboard |
| ChatGPT | `gpt` — Open ChatGPT | `gpt c` — Open ChatGPT with Clipboard |
| Grok | `grok` — Open Grok | `grok c` — Open Grok with Clipboard |

For predictable shortcuts, assign these aliases to their corresponding commands
in **Raycast Settings → Extensions**. Aliases are personal Raycast settings and
are not installed automatically. You can also search for the full command name.

**Type a query:** search for `cla`, press **Tab**, type your question, then press
**Enter**. Claude opens with the question in its chat box. The same flow works
with `gem`, `gpt`, and `grok`.

**Use your clipboard:** copy some text and run `cla c` (or the equivalent for
another destination). Clipboard commands are separate commands and do not need
an argument or Tab.

**Just open the site:** run an open command without entering a query. The
clipboard is used as the prompt only by commands named “with Clipboard.” Blank queries and
empty, whitespace-only, or non-text clipboards simply open the site.

The extension never submits a message automatically. A different existing draft
is kept; the extension shows a message instead of replacing it.

## Requirements

- macOS with Raycast and **Google Chrome** installed. Safari, Firefox, and other
  browsers are not supported by this version.
- Sign in to the AI services you use in Chrome. Each service's own account,
  subscription, and usage limits apply.
- Allow **Raycast** in **System Settings → Privacy & Security → Accessibility**.
  This lets the helper identify and fill the correct chat box.
- Use the English website interface. Composer labels in other languages are
  not currently recognized.

The native helper is bundled for both Apple Silicon and Intel Macs. You do not
need Xcode or a separate helper installation to use the extension.

## Troubleshooting

Keep Chrome in front while the chat loads. If you switch apps, the extension
stops rather than entering text into a different app. Login screens, slow
loading, and website changes can prevent automatic filling. Finish signing in,
wait for the chat box to appear, then run the command again. If you see an
existing-draft message, finish that draft or start an empty chat before retrying.

The extension opens each service's regular new-chat URL. It follows Chrome's
normal profile/window behavior and does not choose an account or profile for you.

## Privacy

This extension has no analytics, AI API integration, or server of its own.
Prompt text is passed to the local helper through standard input, not in URLs,
process arguments, log messages, or files. The helper only targets the expected
composer on the expected HTTPS host and path.

When a chat editor requires paste instead of direct text entry, the helper
temporarily uses the system clipboard, rechecks the focused composer, and invokes
Chrome's Paste menu action. Temporary text is marked transient/concealed for
clipboard managers and excluded from Universal Clipboard. The helper restores
the previous contents afterward unless you have copied something newer in the
meantime. Clipboard history apps must honor those standard markers; forcibly
killing the helper can prevent restoration.

Text placed in a website's editor is subject to that service's normal handling
of drafts and account data, even before you press Send. The extension does not
bypass any service's sign-in or subscription requirements.

## Install from source

Requires Node.js and npm, in addition to the requirements above:

```sh
git clone https://github.com/noah-jacksonn/ai-web-chat-launcher.git
cd ai-web-chat-launcher
npm ci
npm run dev
```

Raycast imports the commands. Stop the watcher with Ctrl-C when finished; the
local commands remain installed.

## Development

```sh
npm run typecheck
npm test
npm run lint
npm run verify:native
npm run build
```

If you change the Swift source, install Xcode Command Line Tools and run
`npm run build:native` before testing or committing. The source and universal
binary build process are documented in [native/README.md](native/README.md).
The bundled executable should be committed together with its source changes.

To submit an update to the Raycast Store, run `npm run publish`. Raycast's CLI
creates or updates a pull request for review; submission does not make an
extension immediately available in the Store.

## Credits and license

Code is released under the [MIT License](LICENSE). Service names and logos
belong to their respective owners; this is an independent extension and is not
affiliated with those providers. See [asset sources](ASSETS.md).
