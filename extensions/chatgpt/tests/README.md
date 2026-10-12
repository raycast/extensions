# ChatGPT extension checks

Run `npm test` from `extensions/chatgpt`.

The catalog tests cover saved model and command migration, inheritance, storage failures, and concurrent edits. The model picker tests ensure that every discovered model is offered without inventing entries. The Raycast runtime tests cover saved model persistence, account model discovery, Ask through the Responses API, and an AI command using selected text.

Run `npm run lint` and `npm run build` before publishing. The build vendors and verifies Codex app-server archives for Intel and Apple Silicon macOS and Windows. The JavaScript runtime harness does not complete a real ChatGPT browser sign-in or inspect native Raycast window rendering; test those in Raycast with `npm run dev`.
