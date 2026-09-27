# Release checklist

## Reproducible build

Use the committed `bun.lock` with Bun and the Node.js version required by Raycast's CLI. From the source directory:

```sh
bun install --frozen-lockfile
bun run release:check
bun audit
```

`release:check` stops on formatting, type, test, Raycast validation, or build failures. It produces the production bundle in `dist/`; it does not publish or install it. The audit needs network access and checks known dependency advisories, not application security.

Raycast Store CI requires `package-lock.json`. Keep it alongside `bun.lock`; generate it with `npm install --package-lock-only --ignore-scripts` and verify the npm-resolved dependency tree before submission. Bun remains the local development runner.

## Live acceptance checks

Automated tests mock API transport. Before release, load the extension with `bun run dev` and verify in Raycast using your own API key (requests may be billed):

- Preferences show only the required password field; existing keys remain usable.
- Refresh loads latest chat models without duplicate labels, Codestral, or Voxtral.
- AI Chat streams a complete answer and correctly uses conversation history.
- An image works on a model reporting vision support.
- A tool-capable model completes a Raycast tool round trip without duplicate execution.
- Cancelling a long response stops it; another prompt still works afterward.
- Missing/invalid credentials show a useful error without exposing the key.

Interrupted-stream recovery is covered by deterministic tests; a successful normal live answer does not exercise every recovery path.

## Before public distribution

- Confirm `author: m1n` is the intended Raycast Store account.
- Review README, help, changelog, and the logo attribution in `assets/README.md`.
- Confirm permission to distribute the logo and retain required upstream license notices.
- Prepare Store screenshots and metadata if submitting to the Store.
- Run the checks above against the exact source being submitted.
- Obtain explicit approval before publishing. No publishing command is part of `release:check`.

## Data handling

The API key is entered in Raycast's password preference. The extension sends the supplied conversation, system instructions, attachments, and tool definitions/results to Mistral for inference. It has no custom analytics or conversation storage. Raycast and Mistral manage their own data handling. Never include credentials, personal chat logs, `.env` files, or local Raycast settings in a release.
