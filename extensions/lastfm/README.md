<p align="center">
  <img src="assets/command-icon.png" height="128">
  <h1 align="center">Last.fm</h1>
  <p align="center">Browse your Last.fm stats and see what's playing — right from Raycast.</p>
</p>

## Commands

| Command                | Description                                                                             |
| ---------------------- | --------------------------------------------------------------------------------------- |
| **Menu Bar Player**    | Shows the currently playing track in the macOS menu bar. Hides when nothing is playing. |
| **Now Playing**        | Detail view of the current track with album art, metadata, and love/unlove.             |
| **Top Songs**          | Your top scrobbled tracks for the selected period.                                      |
| **Recent Songs**       | Your recently scrobbled tracks.                                                         |
| **Top Artists**        | Your top artists for the selected period.                                               |
| **Top Albums**         | Your top albums for the selected period.                                                |
| **Top & Recent Songs** | Combined view of your top and recent tracks.                                            |

## Setup

1. Get a Last.fm API key from [last.fm/api/accounts](https://www.last.fm/api/accounts)
2. Install the extension from the [Raycast Store](https://www.raycast.com/eggsy/lastfm)
3. Open any command and fill in your credentials:
   - **API Key** — your Last.fm API key
   - **Username** — your Last.fm username
   - **Period** — time range for top stats (7 days, 1 month, 3 months, 6 months, 12 months)
   - **Limit** — number of results to show (default: 24)

## Menu Bar Player

The menu bar command shows **Song - Artist** in your menu bar while scrobbling and disappears when nothing is playing.

**Preferences** (accessible via `⌘,` in the dropdown):

| Preference              | Description                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| Menubar Icon            | Show the Last.fm icon or album art next to the track name            |
| Now Playing Text Length | Truncate the title to N characters (default: 20, 0 = no limit)       |
| Hide Artist's Name      | Show only the track name in the menu bar                             |
| Cleanup Song Title      | Strip annotations like `(feat. ...)`, `(Remastered)`, `(Radio Edit)` |

## Love / Unlove Tracks

Loving and unloving tracks requires a one-time connection to your Last.fm account. No password needed — it uses Last.fm's secure web authorization.

**Setup:**

1. Add your **API Secret** to preferences — go to [last.fm/api/accounts](https://www.last.fm/api/accounts), click your app, and copy the secret shown there
2. Open the **Now Playing** command — the metadata panel shows your connection status
3. Open the action panel and click **Step 1: Open Last.fm Auth** — your browser opens Last.fm's authorization page
4. Click **Allow access** on Last.fm, then come back to Raycast
5. Open the action panel again and click **Step 2: Complete Connection**

The same two-step flow is available directly from the **Menu Bar Player** dropdown under **Last.fm**.

Your session is cached indefinitely — you only need to do this once. To revoke access, click **Disconnect**.

Once connected, **Now Playing** and the **Menu Bar Player** each show a single **Love ♥** or **Unlove** action depending on whether the current track is already loved.

> **Note for existing users:** The API secret is shown once when you first create the app. If you no longer have it, visit [last.fm/api/accounts](https://www.last.fm/api/accounts), click on your app, and the secret should be visible. If not, delete the app and create a new one — the API key can stay the same as it does not change.
