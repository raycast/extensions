# Brew Extension for Raycast

Search and manage your brew casks and formulae from [Raycast](https://raycast.com).

## Commands

- **Search** — search brew formulae & casks and install them
- **Show Installed** — list installed formulae & casks, with pinned formulae in their own section
- **Show Upgrades** (previously Show Outdated) — review outdated packages, choose which upgrade, and run it. The review opens with everything not pinned selected (exactly what a plain `brew upgrade` would do), so running immediately upgrades everything. A pin is a lock, matching brew's own behaviour: pinned formulae cannot be selected, and including one means unpinning it first — the primary action on a pinned row does both in one step. Casks are selectable exactly like formulae; cask pinning waits on Homebrew 6's `brew pin --cask` and ships in a follow-up.
- **Upgrade** — upgrade everything outdated in one shot, no review step, with progress reported per package via the toast
- **Manage Services** — start, stop & restart Homebrew services
- **Services Menu Bar** — control Homebrew services from the menu bar
- **Clean up** — clean files and packages from the cache that are older than 120 days
- **Clear Cache** — clear the cached formulae, casks, and installed packages files

## Homebrew 5.0 Compatibility

This extension is compatible with Homebrew 5.0 and later. Key changes in Homebrew 5.0:

- **Concurrent Downloads**: Homebrew 5.0 enables parallel downloads by default. If you experience issues, you can disable this in the extension preferences.
- **Internal API**: Homebrew 5.0 introduces a more efficient internal JSON API. You can opt-in to this experimental feature in preferences.
- **Deprecated Flags**: The `--no-quarantine` and `--quarantine` flags are deprecated in Homebrew 5.0.
- **macOS Support**: Homebrew 5.0 no longer supports macOS Mojave (10.14) and older.

For more details, see the [Homebrew 5.0 release notes](https://brew.sh/2025/11/12/homebrew-5.0.0/).

## Performance

This extension uses several optimizations to provide a fast experience:

- **Two-Phase Loading**: Installed packages load quickly with basic info, then fetch full metadata in the background.
- **Lazy Loading**: Package details are fetched on-demand when viewing, not upfront.
- **Internal API Option**: When enabled, downloads are 96% smaller (~1 MB vs ~30 MB for formulae).

## Install Statistics

Selecting a package shows its install counts (30 / 90 / 365 days) and build errors, taken from the
[formulae.brew.sh](https://formulae.brew.sh) analytics API. Only the selected package is fetched —
about 5 KB per row you land on, and nothing at all for the rest of the list.

**Sort by Popularity** (⇧⌘P in Search) is different: ranking every result requires Homebrew's bulk
30-day rankings, about 2.6 MB for formulae and casks combined. That download happens the first time
you enable the sort, is cached on disk, and is never fetched if you don't use the sort. While it is
on, each row also shows its 30-day install count.

Homebrew's analytics are anonymous and aggregate, and cover macOS installs; a package with no
reported installs simply shows no statistics.

## Issue Tracker

[Report issues here](https://github.com/raycast/extensions/issues/new?body=%3C!--%0APlease%20update%20the%20title%20above%20to%20consisely%20describe%20the%20issue%0A--%3E%0A%0A%23%23%23%20Extension%0A%0Ahttps://www.raycast.com/nhojb/brew%0A%0A%23%23%23%20Description%0A%0A%3C!--%0APlease%20provide%20a%20clear%20and%20concise%20description%20of%20what%20the%20bug%20is.%20Include%0Ascreenshots%20if%20needed.%20Please%20test%20using%20the%20latest%20version%20of%20the%20extension,%20Raycast%20and%20API.%0A--%3E%0A%23%23%23%20Steps%20To%20Reproduce%0A%0A%3C!--%0AYour%20bug%20will%20get%20fixed%20much%20faster%20if%20the%20extension%20author%20can%20easily%20reproduce%20it.%20Issues%20without%20reproduction%20steps%20may%20be%20immediately%20closed%20as%20not%20actionable.%0A--%3E%0A%0A1.%20In%20this%20environment...%0A2.%20With%20this%20config...%0A3.%20Run%20%27...%27%0A4.%20See%20error...%0A%0A%23%23%23%20Current%20Behaviour%0A%0A%0A%23%23%23%20Expected%20Behaviour%0A%0A%23%23%23%20Raycast%20version%0AVersion:%201.103.9%0A&title=%5BBrew%5D%20...&template=extension_bug_report.yml&labels=extension,bug&extension-url=https://www.raycast.com/nhojb/brew&description).
