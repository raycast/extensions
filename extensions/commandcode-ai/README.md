# Command Code AI

Use your [Command Code](https://commandcode.ai) subscription in Raycast — as models in AI Chat, Quick AI, and AI Commands, and through the standalone **Ask Command Code AI** command.

## Setup

- Create an API key in [Command Code Studio](https://commandcode.ai) and paste it into the extension's **API Key** preference.
- Or, if you use the Command Code CLI and ran `cmd login`, leave the preference empty: the extension reads the key from `~/.commandcode/auth.json`.

## Commands

- **Ask Command Code AI**: ask a question, keep asking follow-ups in the same thread, and copy questions, answers, or whole conversations.
- **Refresh Models**: fetch the latest Command Code model list and update Raycast AI's model picker.

## Notes

- Requests go through Command Code's official [Provider API](https://commandcode.ai/docs/provider). Your API key is sent only to `https://api.commandcode.ai`.
- The **Go** plan has no API access, so requests fail on it. Upgrade to GOAT or higher to use this extension.
- Models outside your plan show up in the list but return an error when used.
