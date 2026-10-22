# Developing TrackTimer for Raycast

## Caching

Raycast's native disk cache displays saved timers, recent entries, and project choices immediately. Cache namespaces separate each API key and server; tokens are never stored in query caches. Active timers stay fresh for 15 seconds, recent entries for one minute, and clients/projects for five minutes. The timer form displays cached clients and projects immediately and revalidates them whenever it opens or the selected client changes. Other cached queries avoid new requests within their freshness windows. Stale data refreshes in the background, and data older than 24 hours is discarded.

Manual Refresh and Reload Clients and Projects bypass freshness windows. Timer mutations invalidate timer/history caches. Authorization errors clear cached data; temporary network failures retain the previous snapshot. Running durations advance locally from the last confirmed value. Older history pages are fetched on demand without persistence.

## Local development

From this extension directory (`extensions/tracktimer` in the Raycast extensions repository):

```sh
npm install
npm run dev
```

Raycast must be installed to use the development extension. Sign in to [TrackTimer](https://www.tracktimer.app/app), select a workspace, and choose **API keys** in the account menu to create a key. Enter it in the extension preferences. The extension requires `clients:read`, `projects:read`, `timers:read`, and `timers:write`. The token is stored in Raycast's password preference; do not put it in source files or shell commands.

Workspace admins can select any active client, including clients without projects. Select an existing assigned project to start a timer. Client and project searches filter names without offering creation or selectable placeholder rows. Use **Manage Projects in TrackTimer** to manage projects, then reload the choices. Raycast does not require `projects:write`.

The server is hardcoded in `TRACKTIMER_URL` in `src/session.ts`. To install a personal development build against a local server, temporarily change that constant to your localhost origin (for example `http://localhost:3001`), rebuild, and use a token created on that local server. Restore `https://www.tracktimer.app` before committing or exporting for the Store. Use the canonical www hostname because authenticated API requests reject redirects. Never use Production credentials against Local or Preview. Building this package does not deploy the API.

From `extensions/tracktimer`, run the package checks with:

```sh
npm run build
npm run check-types
npm run lint
```

The distribution build writes to `dist` without installing into Raycast. Use `dev` to load it in Raycast.

Uncertain timer requests are saved locally with their original operation ID. Use **Retry pending timer action** before starting another timer. The saved action includes its description but never the API token. Recent entries refresh every minute while the command is open, and **Refresh** reloads current server state. Starting a timer completes any timer already running for the same user, including in another workspace.

The package includes standalone Raycast ESLint and Prettier configuration. Run the checks above before handing off changes.

## Standalone packaging and Store submission

This directory is self-contained: its dependencies use exact npm versions, with no workspace or catalog dependencies. It can be copied into `extensions/tracktimer` in a fork of [raycast/extensions](https://github.com/raycast/extensions). Keep `src`, `assets`, the manifest, configuration, README, development notes, changelog, and MIT license together.

For a clean export, copy the tracked package files into a fresh directory, excluding `node_modules`, generated output, and `raycast-env.d.ts`. In that exported directory run:

```sh
npm install
npm run build
npm run check-types
npm run lint
```

`npm install` creates the standalone `package-lock.json`; include that lockfile in the Store contribution. Do not generate a second dependency lockfile inside the pnpm monorepo. The manifest is public and includes the `publish` script required by Raycast's publishing CLI.

The registered Raycast author handle is `pfista`. Before submitting, capture up to six 2000 × 1250 PNG screenshots using the running extension (Raycast recommends at least three), with no credentials or other applications visible. Validate the production endpoint and API permissions with an actual account. From the exported directory, run `npm run publish`; Raycast authenticates with GitHub and opens a draft pull request against `raycast/extensions`. Complete the PR description and submit it for review. After Raycast merges it, the extension is automatically published to the Store. The changelog date placeholder is replaced at merge time.

## Attribution

The recent-timer list and quick-start flow are adapted from the [Toggl Track extension](https://www.raycast.com/franzwilhelm/toggl-track), by Franz Wilhelm and contributors, at [commit `fa8b3874b6f49776570e4291d8ed74b532164013`](https://github.com/raycast/extensions/tree/fa8b3874b6f49776570e4291d8ed74b532164013/extensions/toggl-track). TrackTimer replaces its Toggl-specific service integration and branding. The upstream repository's MIT license and copyright notice are preserved in `LICENSE`.

The icon reuses TrackTimer's 3D sundial app artwork: an orange fin above a brushed-metal dial and stone base. It is the 512 × 512 PNG from the macOS app icon and contains no Toggl artwork.
