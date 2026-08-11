# Repository Agent Instructions

## Project

This repository contains a macOS Raycast extension that displays the unofficial Codex reset forecast and recent reset history from `willcodexquotareset.com`.

## Tooling

- Use Node.js 24, as pinned in `.nvmrc`.
- Use npm for dependency management and preserve `package-lock.json`.
- Keep TypeScript strict and follow the repository's Prettier and Raycast ESLint configuration.

## Code Organization

- Keep upstream requests, validation, and persistence in `src/api/`.
- Keep pure forecast formatting and classification logic in `src/domain/`.
- Keep reusable Raycast UI in `src/components/` and stateful data access in `src/hooks/`.
- Treat upstream JSON as untrusted input and validate it at the API boundary.
- Preserve the extension's privacy statement: it must not authenticate with OpenAI, inspect individual accounts, collect personal data, or add analytics.

## Testing

- Add or update focused Vitest coverage for behavior changes.
- Use fixtures in `tests/fixtures/` for representative upstream payloads.
- Run `npm test`, `npm run typecheck`, and `npm run lint` before handing off code changes.
- Run `npm run build` for changes that affect the extension bundle or Raycast integration.
- `npm run test:contract` performs a live network check and should only be run when live endpoint verification is needed.

## Raycast Store Updates

- This extension is already published in the Raycast Store.
- A Store update pull request is currently awaiting review. Check its status before starting release work, and do not create a duplicate submission while it remains open unless the user explicitly asks for one.
- Keep changes requested by Raycast reviewers focused on the existing submission. If maintainers or the author edited the pull-request branch remotely, run `npx @raycast/api@latest pull-contributions` before continuing locally, resolve any conflicts, and validate the result.
- For each user-visible update, prepend a concise entry to `CHANGELOG.md` using `## [Release Title] - {PR_MERGE_DATE}`. Preserve prior entries; Raycast replaces the placeholder when the Store pull request merges.
- Update `README.md`, extension metadata, and Store screenshots when behavior or visible UI changes make the published material inaccurate. Store screenshots are 2000×1250 PNG files under `metadata/`.
- Before submitting an update, run `npm test`, `npm run typecheck`, `npm run lint`, and `npm run build`. Run the live contract test when the upstream API contract is affected.
- `npm run publish` validates the extension and creates or updates the Raycast Store pull request. Publishing is an external action: run it only when the user explicitly requests submission or an update to the current Store PR.
- When review feedback arrives, implement and verify the requested changes, update the same Store submission, and report which checks were run. Do not open an unrelated replacement pull request.

## Change Discipline

- Make narrow changes and preserve unrelated work already present in the working tree.
- Do not change generated `raycast-env.d.ts` manually.
- Do not publish the extension or make external submissions unless the user explicitly requests it.
