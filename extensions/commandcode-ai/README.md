# CommandCode AI

Use your [CommandCode](https://commandcode.ai) subscription in Raycast — as models in AI Chat, Quick AI, and AI Commands, and through the standalone **Ask CommandCode AI** command.

## Setup

- If you use the CommandCode CLI and ran `cmd login`, there's nothing to do: the extension reads the key from `~/.commandcode/auth.json`.
- Otherwise, paste a CommandCode API key into the extension's **API Key** preference.

## Commands

- **Ask CommandCode AI**: ask a question, keep asking follow-ups in the same thread, and copy questions, answers, or whole conversations.
- **Refresh Models**: fetch the latest CommandCode model list and update Raycast AI's model picker.

## Notes

- CommandCode has no public model-list endpoint, so the model list is read from the latest published `command-code` npm package and cached until a new version ships.
- Models outside your plan show up in the list but return a "not in plan" error.
- Your API key is sent only to `https://api.commandcode.ai`.
