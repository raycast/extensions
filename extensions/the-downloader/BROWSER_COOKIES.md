# Cookies from Browser

Some image galleries require you to be logged in — private subreddits, Patreon posts, certain Pixiv works, and so on. The Downloader can borrow cookies from a browser you're already logged into, so gallery-dl sees the same content you do.

## Pick your browser

Open the extension's preferences and find **Gallery: Cookies from Browser**. Pick the browser you're logged into:

Chrome, Chromium, Firefox, Safari, Edge, Brave, Opera, Vivaldi, LibreWolf, Arc, Zen, Floorp, or **Custom**.

That's it for most people — the extension finds the right profile automatically.

If the browser isn't installed (or hasn't been opened yet, so it has no cookies on disk), the download stops with a toast like _"No Arc profile with cookies was found"_. Install/open the browser, or switch to **Custom**.

## Custom Browser Spec

Pick **Custom** when:

- Your browser isn't in the list above.
- You want a non-default profile (e.g. a work profile, or `Profile 2` instead of `Default`).
- Your profile lives somewhere unusual.

Then fill in **Gallery: Custom Browser Spec** with a gallery-dl `--cookies-from-browser` value.

### Format

```
<browser>[:<profile-or-path>]
```

`<browser>` is what gallery-dl understands: `chrome`, `chromium`, `edge`, `brave`, `opera`, `vivaldi`, `firefox`, `safari`, etc. For Chromium-derived browsers not in that list (Arc, Thorium, …), use `chromium`. For Firefox forks (Zen, Floorp, LibreWolf, Waterfox, …), use `firefox`.

### Examples

A specific Chrome profile by name:

```
chrome:Profile 2
```

A Firefox-fork profile by full path (Windows):

```
firefox:C:\Users\you\AppData\Roaming\Waterfox\Profiles\abcd1234.default
```

A Chromium-fork profile by full path (macOS):

```
chromium:/Users/you/Library/Application Support/Thorium/Default
```

Anything you put here is passed straight to gallery-dl's `--cookies-from-browser`, so gallery-dl's docs are the source of truth: https://github.com/mikf/gallery-dl/blob/master/docs/configuration.rst#extractorcookies

### Finding your profile

- **Firefox-family** (Firefox, Zen, Floorp, LibreWolf, Waterfox): visit `about:profiles` — the "Root Directory" of the profile you use is the path you want.
- **Chromium-family** (Chrome, Edge, Brave, Arc, Vivaldi, Thorium): visit `chrome://version` (or the equivalent for your browser) — "Profile Path" is what you want.

The profile must have been opened at least once and have a cookies file (`cookies.sqlite` for Firefox; `Cookies` or `Network/Cookies` for Chromium).
