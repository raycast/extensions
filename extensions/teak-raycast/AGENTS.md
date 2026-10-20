# Raycast conventions

The `ray` CLI ships inside `@raycast/api` (there is no `@raycast/cli` npm
package); workspace scripts resolve it from the hoisted `node_modules/.bin`.

`build`, `lint`, `typecheck`, and `test` run headless. `dev` (`ray develop`)
additionally requires the Raycast macOS app installed, running, and signed in;
without it, develop compiles and then warns that Raycast is not running.
Install the app with `brew install --cask raycast`.

`package-lock.json` is intentionally committed: Raycast store CI runs `npm ci`
on the mirrored extension, so the lockfile must stay in sync with
`package.json`. Regenerate it from `apps/raycast` with
`npm install --package-lock-only --ignore-scripts --workspaces=false`. The
`--workspaces=false` flag prevents npm from traversing Bun workspace packages.
Then confirm lockstep versions still match.

## API calls

`src/lib/api.ts` sends every request through `teak-sdk`'s `createTeakClient`.
It adds what Raycast needs on top: the auth mode (an interactive command signs
in again after a 401, a silent one reports it), the `localhost` to `127.0.0.1`
retry, Raycast's error codes, and the strict card parsers in `apiParsers.ts`.

Raycast pins the published `teak-sdk` in `package.json` and
`package-lock.json`, but Bun resolves it to the workspace copy, so monorepo
checks cannot catch a call the pinned version lacks. Use only what the pinned
version publishes. To prove it, copy `apps/raycast` out of the monorepo, run
`npm ci`, then `npx tsc --noEmit`, `bun test src/__tests__ --isolate` and
`npx ray build` there (`workspaceParity.test.ts` checks Raycast's copies of
Teak's tables against the workspace and fails outside the monorepo).
