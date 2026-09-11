# Code Review

Review performed on 2026-09-11 against the supplied Tinkerer API catalog, live read-only API behavior, and current Raycast extension documentation.

## Resolved Findings

### Security

- Remote custom endpoints could use plaintext HTTP and receive the API key. The client now requires HTTPS, with HTTP limited to localhost development.
- Credentials remain confined to Raycast's password preference and the `x-api-key` request header. No credential logging or hardcoded production key was found.
- All UI mutations require confirmation. The two AI mutation tools export native `Tool.Confirmation` handlers.

### API Correctness

- Empty conversations previously attempted to load comments in a failing edge case. Feed items with zero comments now skip `post.listComments`; commentable items open the first-comment form directly.
- Article discovery now has a dedicated typed client and Raycast AI tool. Full article content loads through `post.byId`, and browser links use the verified `/posts/{id}` route.
- Search and prompt queries are capped at the catalog's 100- and 120-character limits. Article queries are capped at 200 characters.
- Topic loading in Quick Post now participates in the form's loading state instead of initially presenting an unexplained empty picker.

### Raycast UX and Store Standards

- Root commands no longer override Raycast's navigation title.
- Long dynamic article, prompt, and JSON detail titles are replaced or bounded.
- Command names are concise and title-cased; empty states are deferred until loading completes.
- The stale hardcoded API procedure count was removed.
- The unused SVG asset and internal planning prose were removed from the public package.

### Dependencies and Build

- Direct dependencies were checked against the npm registry. Every package is at the latest compatible version.
- TypeScript remains at 6.0.3 because the current Raycast ESLint config requires TypeScript `<6.1.0`; TypeScript 7.0.2 fails that supported toolchain.
- `npm audit` reports zero known vulnerabilities.
- Type checking, 20 unit tests, Raycast linting, and the production build pass.

## Open Release Evidence

- `needs_evidence`: Tinkerer Club authorization for public use of its name, icon, and authenticated API.
- `needs_evidence`: Tinkerer Club API terms permitting public distribution of these workflows.
- Five 2000 x 1250 Store screenshots are present and pass Raycast metadata validation.
- Member names, handles, and avatars are redacted in the Store screenshots.

Raycast 2.3 exposes the screenshot workflow as **Capture Window**, although the current developer guide still calls it **Window Capture**. The command is installed and was opened during the review; saving authenticated member content for a public Store listing remains an explicit approval gate.

No unresolved implementation defect was found in the reviewed scope. The open items are platform publication permissions, not code failures.
