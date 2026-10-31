# Contributing

Use Node 24 and the committed npm lockfile. Keep dependencies exact and add none
when the platform already provides what is needed. Follow the
[Raycast Store requirements](https://developers.raycast.com/basics/prepare-an-extension-for-store)
and `@raycast/api` conventions.

```sh
npm ci
npm run typecheck
npm run lint -- --non-interactive
npx --no-install prettier --check .
npm test
npm run build -- --environment dist --non-interactive --output dist
```

`ray lint` validates the author and manifest against Raycast over HTTPS, without
requiring login. If offline, use `npx --no-install eslint src` and
`npx --no-install prettier --check .`; these do not replace the online manifest
and author checks before submission. Build output (`dist/`, `*.rayext`) and
generated `raycast-env.d.ts` stay out of Git.

If pre-commit and TruffleHog are available locally, run `pre-commit install`, then
`pre-commit run --all-files`. No global npm packages are needed. The hooks match
Glimmer's applicable whitespace, file, YAML, Markdown and secret checks. Prettier
uses this repository's locked version and formatting options. Secret findings
and scanner diagnostics are withheld; the private-key check runs offline. Hooks
scan the supplied files, including the staged versions during a normal commit;
they do not audit Git history. Include new files with `pre-commit run --files ...`
before staging. Never put credentials in source, fixtures, screenshots or logs.

Keep comments at most three lines. Pin GitHub Actions to full commit SHAs with
version comments and grant each job only its required permissions. Renovate
groups updates into one rolling PR, including major updates, with no automerge.

Contract fixtures and their refresh command are documented in
[tests/fixtures/glimmer/README.md](tests/fixtures/glimmer/README.md).
Before Store submission, test with real paired PCs in Raycast, verify the author
account, capture real screenshots under `metadata/`, and sign in to Raycast if
needed. Store submission is an owner action after review.
