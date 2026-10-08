# Apple Foundation Models

Use Apple's on-device language model from Raycast. Ask questions, chat, summarize, rewrite, proofread, translate and explain selected or copied text, and ask about images from Finder, the clipboard or a file. The model runs on your Mac, so your text and images do not leave it, and there is no account or API key.

The extension talks to the model through `fm`, the Foundation Models command line tool that comes with macOS 27.

## Requirements

- macOS 27 or later
- A Mac with Apple silicon (M1 or later)
- Apple Intelligence turned on in **System Settings → Apple Intelligence & Siri**, and the on-device model downloaded. `fm available` prints `System model available` when it is ready.
- The `fm` license accepted once. Open Terminal, run `sudo fm license`, read it and answer `y`. The extension never accepts it for you.

Run **Check Setup** to see what is missing. It shows each step and how to fix it, and it can send a short test prompt.

## Commands

| Command | What it does |
|---------|--------------|
| Ask | Ask a question and see the answer as it is written. Continue the answer as a chat. |
| Chat | Chat with the model. Type a question in the chat list to start a new chat with it. Chats are saved on your Mac and can be renamed or deleted. Each chat has its own instructions. |
| Summarize Selected Text | Short bullet points for the text selected in any app, or the text on the clipboard. |
| Rewrite Selected Text | Rewrite the selected text in a professional, friendly, concise or simple tone. |
| Proofread Selected Text | Fix spelling, grammar and punctuation. |
| Translate Selected Text | Translate into the language you choose (or the default in the preferences). |
| Explain Selected Text | Explain the selected text in simple words. |
| Describe Image | Ask about an image. It picks up an image selected in Finder (when Finder is the frontmost app), an image file or image data on the clipboard (for example a screenshot copied with ⌃⇧⌘4), or your latest screenshot (⌘L). Type a question as the argument to get the answer right away. It can also read text and barcodes in the image. |
| Check Setup | Check macOS, the `fm` license, Apple Intelligence and the model. |

The text commands use the selected text. When nothing is selected, they use the text on the clipboard instead, and the result shows the start of that text. The clipboard result opens in the Ask command, so keep Ask turned on to use it. You can turn the clipboard off in the preferences.

Results can be copied or pasted into the frontmost app. Pasting right after a text command replaces the text that is still selected.

## Good to know

- The on-device model is small (about 3 billion parameters). It is good at summaries, rewriting, extraction and short answers. Check facts, math and code yourself.
- It can see about 8,000 tokens at a time. Long chats keep working: the oldest messages are left out first, and the chat shows how much of the context was used. Selected text that is too long is rejected before it is sent.
- Each answer runs one short `fm respond` process that ends when the answer is done. **Stop** (⌃C in Chat) or closing the command ends it right away. Nothing keeps running in the background.
- In Chat you can type your next message while an answer is still being written. It is sent when the answer is done. A stopped answer stays in the chat, so you can ask about it.
- The first time Describe Image reads the Finder selection, macOS asks whether Raycast may control Finder. Allow it to use images selected in Finder. Clipboard images and files work without it.
- Chats are stored as JSON files in the extension's support folder. Image data from the clipboard is saved to a temporary file only when you ask about it. The file is removed when you close the answer. A file left behind, for example when Raycast quits during an answer, is removed after an hour, the next time Describe Image or Chat opens.

## Preferences

- **Chat Instructions**: instructions for new chats and for Ask.
- **Translate To**: the default language for Translate Selected Text.
- **Clipboard**: use the text on the clipboard when nothing is selected (on by default).
- **Text Tools**: uses the `permissive-content-transformations` guardrail level for the text commands, which Apple made for working on text you provide. Turn it off to use the default level.
