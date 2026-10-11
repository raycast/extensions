# TrackTimer for Raycast

TrackTimer for Raycast supports macOS and connects to `https://www.tracktimer.app`. Enter your TrackTimer API token in the extension preferences; the server URL is not configurable.

## Menu bar (macOS)

Run **TrackTimer Menu Bar** once to enable it. In that command’s Raycast preferences, choose **Current timer**, **Today’s tracked time**, or **Today’s earnings**. Current timer mode falls back to today’s tracked time when idle. The dropdown shows the current project, today’s totals, Stop Timer, and shortcuts to start or manage timers.

The active timer is polled every 10 seconds, including while the dropdown is open. Daily totals are cached for up to one minute; manual Refresh and successful timer actions in this extension refresh them immediately. macOS may delay background updates, particularly on battery; this is a minute-level display rather than a ticking seconds clock. Enable background refresh in Raycast if it is disabled.

Today follows your Mac’s timezone, includes the portion of running timers since midnight, and keeps earnings in separate currencies. Earnings use recorded pay rates and represent tracked earnings, not payments received. This command requires the server’s `/api/v1/summary` endpoint and the existing `timers:read` permission. Failed refreshes show **Unavailable** instead of an apparently current total.

## Caching

Raycast's native disk cache displays saved timers and project choices immediately. Cache namespaces separate each API key and server; tokens are never stored in query caches. Active timers stay fresh for 15 seconds, recent entries for one minute, and clients/projects for five minutes. The timer form displays cached clients and projects immediately and revalidates them whenever it opens or the selected client changes. Other cached queries avoid new requests within their freshness windows. Stale data refreshes in the background, and data older than 24 hours is discarded.

Manual Refresh and Reload Clients and Projects bypass freshness windows. Timer mutations invalidate timer/history caches. Authorization errors clear cached data; temporary network failures retain the previous snapshot. Running durations advance locally from the last confirmed value. Older history pages are fetched on demand without persistence.

Control your TrackTimer timers from Raycast. **Start/Stop Timer** shows your running timer and recent work; **Start New Timer** opens a description and project form. Restarting recent work creates a new timer rather than editing historical entries.

## Local development

From this extension directory:

```sh
npm install
npm run dev
```

Raycast must be installed to use the development extension. In its preferences, enter a TrackTimer API token created in TrackTimer Settings (the default key includes `clients:read`, `projects:read`, `timers:read`, and `timers:write`). The token is stored in Raycast's password preference; do not put it in source files or shell commands.

Workspace admins can select any active client, including clients without projects. Select an existing assigned project to start a timer. Client and project searches filter names without offering creation or selectable placeholder rows. Use **Manage Projects in TrackTimer** to manage projects, then reload the choices. Raycast does not require `projects:write`.

The server is hardcoded in `TRACKTIMER_URL` in `src/session.ts`. To install a personal development build against a local server, temporarily change that constant to your localhost origin (for example `http://localhost:3001`), rebuild, and use a token created on that local server. Restore `https://www.tracktimer.app` before committing or exporting for the Store. Use the canonical www hostname because authenticated API requests reject redirects. Never use Production credentials against Local or Preview. Building this package does not deploy the API.

```sh
npm run build
npm run check-types
npm run lint
```

The distribution build writes to `dist` without installing into Raycast. Use `dev` to load it in Raycast.

Uncertain timer requests are saved locally with their original operation ID. Use **Retry pending timer action** before starting another timer. The saved action includes its description but never the API token. Recent entries refresh every minute while the command is open, and **Refresh** reloads current server state. Starting a timer completes any timer already running for the same user, including in another workspace.

This package uses Raycast ESLint and Prettier. Unit tests are maintained in the TrackTimer source repository and run with its Vitest setup.

## Standalone packaging and Store submission

This directory is self-contained: its dependencies use exact npm versions, with no workspace or catalog dependencies. It can be copied into `extensions/tracktimer` in a fork of [raycast/extensions](https://github.com/raycast/extensions). Keep `src`, `assets`, the manifest, configuration, README, changelog, and MIT license together.

For a clean export, copy the tracked package files into a fresh directory, excluding `node_modules`, generated output, and `raycast-env.d.ts`. In that exported directory run:

```sh
npm install
npm run build
npm run check-types
npm run lint
```

`npm install` creates the standalone `package-lock.json`; include that lockfile in the Store contribution. Do not generate a second dependency lockfile inside the pnpm monorepo. The manifest is public and includes the `publish` script required by Raycast’s publishing CLI.

The registered Raycast author handle is `pfista`. Before submitting, capture up to six 2000 × 1250 PNG screenshots using the running extension (Raycast recommends at least three), with no credentials or other applications visible. Validate the production endpoint and API permissions with an actual account. From the exported directory, run `npm run publish`; Raycast authenticates with GitHub and opens a draft pull request against `raycast/extensions`. Complete the PR description and submit it for review. After Raycast merges it, the extension is automatically published to the Store. The changelog date placeholder is replaced at merge time.

## Upstream provenance

The recent-timer list and quick-start flow are adapted from the [Toggl Track extension](https://www.raycast.com/franzwilhelm/toggl-track), by Franz Wilhelm and contributors, at the user-selected [commit `fa8b3874b6f49776570e4291d8ed74b532164013`](https://github.com/raycast/extensions/tree/fa8b3874b6f49776570e4291d8ed74b532164013/extensions/toggl-track). TrackTimer replaces its Toggl-specific service integration and branding. Unrelated Toggl management commands and integrations are outside this initial package.

The upstream repository's MIT license and copyright notice are preserved in `LICENSE`. The icon is a vector rendition of TrackTimer's existing orange-circle, white-T mark in `apps/web/src/components/public-shell.tsx`, rendered to a 512 × 512 PNG. It contains no Toggl artwork.
