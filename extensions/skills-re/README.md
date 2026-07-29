# skills.re

Search and manage agent skills from skills.re.

## Commands

- Search Skills: search the public registry by keyword without signing in, open a skill, copy its path, copy an install command, save it, or copy its archive download URL.
- AI Search: add a skills.re API token and search the public registry by meaning.
- Saved Skills: add a skills.re API token and manage skills saved to your library.
- Configure API Token: add, update, or remove a skills.re API token from a skippable Raycast form.

## API Token

API-token setup is optional. Generate a token at `https://skills.re/dashboard/settings`, then save it with the Configure API Token command to enable AI Search, Saved Skills, and saving skills.

You can skip setup and continue using public keyword search without a token.

## Publishing

From the repository root, run `npm run raycast:publish`. This runs Raycast's publish
flow from the extension directory and opens a pull request in `raycast/extensions`.
