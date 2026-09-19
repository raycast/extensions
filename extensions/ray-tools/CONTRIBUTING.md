# Contributing

Thanks for helping improve Ray Tools.

## Development setup

1. Install Node.js 22.22.2 or newer.
2. Install dependencies with `npm ci`.
3. Run the complete local quality gate:

   ```bash
   npm run check
   ```

4. Run `npm run dev` to load the extension in Raycast while developing.

## Project conventions

- Keep tools independent under `src/tools/<tool-name>`.
- Keep domain logic free of Raycast imports.
- Put external integrations behind a small provider interface.
- Add or update unit tests for behavior changes.
- Do not commit `.env` files, credentials, private keys, personal data, or confidential translation samples.

## Pull requests

- Explain what changed and why.
- Keep changes focused and avoid unrelated reformatting.
- Include the commands used to verify the change, normally `npm run check`.
- Make sure the CI checks pass before requesting review.

For security issues, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
