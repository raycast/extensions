# Contributing to WordingKit

Thanks for considering a contribution. WordingKit is a small Raycast extension,
so the best contributions are focused, reproducible, and easy to review.

## Development setup

```bash
npm ci
npm run dev
```

Use `WordingKit Settings` in Raycast to configure local modes and provider
preferences during manual testing.

## Before opening a pull request

Run the checks that match your change:

```bash
npm test
npm run lint
npm run build
```

For UI or provider-contract changes, also do a manual Raycast check:

- select text in another macOS app;
- run `Rewrite This`;
- confirm Enter rewrites and pastes back into the source app;
- verify cancellation and provider error states do not paste text;
- verify custom modes still save, edit, delete, and sort correctly.

## Scope guidelines

- Keep changes small and tied to a visible user or maintainer problem.
- Put provider HTTP behavior in `src/providers.ts` or `src/ollama.ts`.
- Put built-in mode labels and prompts in `src/tones.ts`.
- Put mode storage and sorting behavior in `src/modes.ts`.
- Add or update tests in `test/` for provider contracts, storage behavior, and
  critical UI-flow guarantees.
- Do not commit `node_modules`, `.env*`, API keys, generated evaluation
  reports, private screenshots, or local Raycast state.

## Manual evaluation

Manual rewrite evaluation is optional and not part of CI:

```bash
npm run eval:generate-modes
npm run eval:rewrites
```

Before committing changes under `manual-eval/`, make sure sample messages are
safe to publish and do not contain private conversations or customer data.

## Commit messages

Use Conventional Commits:

```text
feat: add provider selection shortcut
fix: redact provider error details
docs: document local ollama setup
test: cover custom mode migration
```
