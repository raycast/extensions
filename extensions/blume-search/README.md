# Blume Search for Raycast

Search the same projects, conversations, messages, setup artifacts, and suggestions as Blume's
in-app search. The extension starts the local search helper shipped inside Blume; the helper uses
Blume's shared search use case and a read-only SQLite adapter. Nothing is sent over the network.

## Develop locally

1. Install a Blume build that includes the Raycast search helper and open it once so its database exists.
2. Run `cd apps/raycast && npm ci`. The extension is intentionally excluded from the pnpm
   workspace because Raycast Store CI consumes its standalone `package-lock.json`.
3. Run `npm run dev` and open **Search Blume** in Raycast.

Stable Blume is used by default. To search Blume Canary, choose it under **Blume Application** in
Raycast's extension preferences. One helper process stays alive only while the command is open,
and its database is protected by SQLite read-only and `query_only` enforcement.

## Store releases

Raycast Store publishing is review-based: `ray publish` submits or updates a pull request in
`raycast/extensions`, and Raycast deploys the extension after that pull request is merged.

The repository's **Raycast Extension** workflow validates every extension change using npm, the
same package manager used by Raycast's Store CI. To enable automatic update submissions after a
compatible Blume desktop release is stable:

1. Sign in with `ray login` and confirm that `ray profile` reports the manifest's registered
   Raycast Store handle (`olav_ljosland`).
2. Create a protected `raycast-store` GitHub environment.
3. Add `RAYCAST_TOKEN` and `RAYCAST_GITHUB_TOKEN` secrets to that environment. The GitHub token
   must be able to create or update the Raycast extensions pull request.
4. Run the workflow manually with **submit** enabled for the initial Store submission. Optionally
   provide the stable desktop tag; otherwise the workflow reads the live Blume stable update feed.
   Public Store publication intentionally runs without Raycast's unsupported `--non-interactive`
   flag; the environment secrets provide Raycast and GitHub authentication without a login prompt.
5. After the desktop helper has reached stable Blume, set the repository variable
   `RAYCAST_AUTO_SUBMIT` to `true`. Later merges that change `apps/raycast`, and later successful
   stable desktop promotions, will automatically submit an update for Raycast review.

Leave `RAYCAST_AUTO_SUBMIT` disabled before the compatible desktop helper is available to stable
users. Both manual and automatic submissions verify that the chosen stable release is on main,
matches the immutable stable-promotion marker and live update feed, contains the helper source,
ready-frame support, and build entry, and publishes the expected macOS updater ZIP. Current helpers
advertise their supported protocol versions before accepting searches.
During the additive rollout, the extension waits briefly for that frame and then falls back to the
previous request-first protocol v1 used by older helper builds; unsupported advertised versions fail
with an update prompt. This compatibility window can be removed in a later extension release after
the ready-frame desktop release is stable, and rolling back the extension remains safe while helpers
continue to accept v1 requests. The workflow never publishes from pull requests or non-default
branches.
