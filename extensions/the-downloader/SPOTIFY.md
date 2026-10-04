# Spotify Downloads

The Downloader uses [spotDL](https://github.com/spotDL/spotify-downloader) for Spotify links — pasted track, album, or playlist URLs get fetched as audio files (MP3, M4A, OPUS, or FLAC, your choice).

spotDL needs Spotify API credentials to look up track metadata (title, artist, album, cover art). Without them it falls back to an anonymous flow that frequently fails with _"Could not get session auth tokens"_. The fix is a free Spotify Developer app — it takes about a minute, and you only do it once.

## One-time setup

### 1. Create a Spotify Developer app

1. Go to https://developer.spotify.com/dashboard. Log in with any Spotify account (free works).
2. Click **Create app**.
3. Fill in:
   - **App name** — anything, e.g. `Raycast Downloader`.
   - **App description** — anything, e.g. `Personal use`.
   - **Website** — leave blank.
   - **Redirect URIs** — type `http://127.0.0.1:9900/`, **then click the purple `Add` button on the right.** This is the easy-to-miss step — the URI needs to show up as a chip below the field; just typing it isn't enough. Spotify is strict about this format: `http://localhost/...` is rejected, `http://127.0.0.1:<port>/...` works. The `9900/` value is what spotDL uses during user-auth; matching it now lets you flip on private-playlist support later without revisiting the Dev app.
   - **Which API/SDKs are you planning to use?** — tick **Web API**.
4. Tick **I understand and agree with Spotify's Developer Terms of Service and Design Guidelines** and click **Save**.

### 2. Grab your credentials

After Save, you land on the app's **Basic Information** screen:

- **Client ID** is shown at the top in a copy-friendly box — copy it.
- Just below, click **View client secret** — the secret expands inline; copy it.
- (You'll also see **App Status: Development mode**, **App name**, **Redirect URIs**, **APIs used: Web API** — that's all expected for a personal-use app.)

### 3. Paste them into the extension

1. In Raycast, press **⌘,** with the extension's command focused (or right-click → **Configure Extension**).
2. Paste your Client ID into **Spotify: Client ID**.
3. Paste your Client Secret into **Spotify: Client Secret**.
4. Close preferences. Done.

> **Heads up — if the Download form was already open when you pasted the credentials**, close it and re-open the Download command (or trigger Fast Download fresh). Raycast reads preferences when a command first launches; a form that was open with empty creds keeps using empty creds until you re-launch it.

## What this enables

- Track downloads (`open.spotify.com/track/…`)
- Album downloads (`open.spotify.com/album/…`)
- Public playlist downloads (`open.spotify.com/playlist/…`)

**Private playlists and your saved library** need one more step — see below.

## Private playlists & your library (optional)

The Client ID/Secret above use Spotify's *client-credentials* flow, which can only see **public** content. Trying to download a private playlist returns "0 tracks" or an `HTTP Error … /playlists/…/items` toast.

To unlock private content, enable **Spotify: User Authentication** in extension preferences (the checkbox right under Client Secret).

What happens on the next Spotify download:

1. spotDL spawns, sees the OAuth flag, and starts a local HTTP server on `http://127.0.0.1:9900/`.
2. Your default browser opens to a Spotify authorization page for *your* Dev app. You'll see:
   - **Title:** _Allow Spotify to connect to: \<your app name\>_ (e.g. "raycast")
   - **Your Spotify account name** (with profile picture) and a small "Not you?" link
   - A list of permissions the app is requesting — view your account, your activity (saved songs, who you follow, your playlists and followed playlists)
   - A green **Agree** button and a smaller **Cancel** link
3. Click **Agree**. The browser navigates to `http://127.0.0.1:9900/?code=…` — you'll likely see a blank page or "This site can't be reached / connection refused" *after a second or two*. That's expected and harmless: spotDL's local server captured the code in the millisecond before closing.
4. Back in Raycast, the download proceeds. The access token is cached to disk so every subsequent download skips the browser dance.

Four gotchas:

- The Redirect URI on the Dev app **must include** `http://127.0.0.1:9900/` exactly (with the trailing slash, no path). If you registered something different earlier (e.g. `:8080/callback`), open your Dev app on developer.spotify.com → Settings → Redirect URIs, click **Add**, paste `http://127.0.0.1:9900/`, click **Add** (the purple button — chip needs to appear), then **Save**. Otherwise Spotify shows "redirect_uri: Not matching configuration" and refuses to authorize.
- Port 9900 must be free when you authorize. If something else is bound to it (rare), the OAuth callback never reaches spotDL — the 2-minute watchdog will kill the wedged child and surface a clear error.
- Public downloads work either way. Leave the checkbox off until you actually need private content.
- spotDL's OAuth requests the scopes `playlist-read-private`, `user-library-read`, `user-follow-read` — **not** `playlist-read-collaborative`. Collaborative playlists, "unlisted" link-only playlists, and playlists owned by other users that are private-to-them all stay inaccessible even after authorizing. Symptom: `HTTP Error for GET /v1/playlists/<id>/items` after the green Agree button. If you suspect a playlist is in this bucket, open it in a private browser window while logged out — if Spotify still loads it via the URL but won't return it from `/playlists/<id>` in their API explorer, it's the unlisted case and you can't get it via the API.

If a public-looking playlist returns "0 tracks", check whether it's actually public — open it in a private/incognito browser tab while logged out. If you can't see it there, it's private to your account.

Track and album downloads land directly in your configured download folder, named `<Artists> - <Title>.<ext>`. Playlist downloads land in a subfolder named after the playlist (e.g. `Downloads/My Mix/<Artists> - <Title>.<ext>`) so a multi-track grab doesn't scatter across the root. The audio itself is sourced from YouTube Music via yt-dlp — that's how spotDL works under the hood; Spotify doesn't expose raw audio.

## Troubleshooting

**Still getting "Could not get session auth tokens"** — double-check that both Client ID and Client Secret are pasted with no surrounding whitespace. Spotify Client IDs are 32 hex-like characters; Client Secrets are also 32. The extension automatically passes `--use-official-api` when both are set, which routes spotDL through the Spotify Web API and skips its broken librespot fallback — so if both fields are filled correctly, this error should not appear.

**`Failed to fetch secrets: code.thetadev.de` in the log** — that's spotDL trying to refresh librespot's anonymous secrets from a third-party host. It's only used when the extension doesn't pass `--use-official-api`. Setting your Client ID/Secret makes this fetch unnecessary; the line should disappear from the log after you fill them in.

**"AudioProviderError" or YouTube-side errors** — the track isn't available on YouTube Music (region-locked, removed, etc.). spotDL can't work around this.

**`spotDL upstream bug` toast (KeyError / AttributeError / TypeError in the traceback)** — Spotify changed its API response shape and the installed spotDL build hasn't caught up. Common signature: `KeyError: 'label'` on album downloads. Workarounds: try a different track/album, or check https://github.com/spotDL/spotify-downloader/issues for a fix in a newer release. To pick up a fix, delete `<Raycast extension data>/spotdl.exe` and re-run a Spotify download — the install screen reappears and grabs the latest from GitHub.

**`HTTP Error for GET /v1/playlists/<id>/items returned 404`** (without user-auth): client-credentials auth can't see the playlist at all. Usually means the playlist isn't public. Enable **Spotify: User Authentication** in preferences and retry.

**`HTTP Error for GET /v1/playlists/<id>/items returned 403`** (with user-auth): you authenticated successfully but Spotify refuses to expose *this specific playlist's* contents to *your* account. Three causes, in order of likelihood:

1. The playlist is private and owned by someone else — ask the owner to flip it to **Public** (Spotify app → playlist → ⋯ → Make Public). User-auth's `playlist-read-private` scope only covers playlists *you* own.
2. It's a collaborative playlist where you aren't a contributor — spotDL doesn't request `playlist-read-collaborative`, so even adding you as collaborator wouldn't help today.
3. It's a Spotify-curated mix or radio-style playlist (Daily Mix, Discover Weekly, Release Radar) — those have special access rules that aren't exposed via the public Web API.

To verify the chain itself is healthy, try `https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M` (Today's Top Hits). If that downloads into its own `Today's Top Hits/` folder, your credentials and OAuth are fine and the 403 is purely about that one playlist's privacy.

Note: spotDL often downloads a handful of tracks before the 403 surfaces — the metadata endpoint `/playlists/{id}` returns the first batch of track URIs inline, and spotDL grabs those before the paginated `/items` call fails. Partial results in your Downloads folder don't mean the chain is broken.

**"redirect_uri: Not matching configuration" in the browser** — you enabled user-auth but `http://127.0.0.1:9900/` isn't on the Dev app's Redirect URIs list. Add it there (developer.spotify.com → your app → Settings → Redirect URIs → Add → Save) and try again.

**Download hangs forever ("Downloading from Spotify… 0 tracks" indefinitely)** — shouldn't happen as of the watchdog, but if it does the extension auto-kills the process after 2 minutes of silence and shows a clear failure. If you keep seeing it, share the toast text on the repo.

**Credentials look right but downloads still fail "credentials missing"** — the Download form was open before you saved the preferences. Close it (`Esc` or back arrow) and re-open the Download command so it picks up the fresh values.

**Changed Client ID/Secret and Spotify still rejects auth** — the extension automatically deletes spotDL's cached OAuth token (at `~/.spotdl/.spotipy`) whenever the credential set changes, so the new credentials are used on the next run. If you have a download in flight when you change credentials, finish or cancel it first and then retry — the invalidation happens at download start.

**macOS only — `spotDL needs Rosetta 2` toast or `bad CPU type in executable`** — the spotDL prebuilt binary is Intel-only (no native arm64 build upstream as of v4.5.0), and Apple Silicon Macs need Rosetta 2 to run it. Open Terminal and run `softwareupdate --install-rosetta --agree-to-license`, then retry. As an alternative, use the **Install via Homebrew** action on the spotDL install screen — `brew install spotdl` uses Python and runs natively on Apple Silicon without Rosetta.
