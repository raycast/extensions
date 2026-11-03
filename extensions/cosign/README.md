<div align="center">

<img src="media/extension-icon.png" width="128" alt="Cosign">

# Cosign

[![License MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](https://github.com/chrismessina/raycast-cosign/blob/main/LICENSE)
[![Follow @chrismessina](https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social)](https://github.com/chrismessina)
[![Stars](https://img.shields.io/github/stars/chrismessina/raycast-cosign?style=social)](https://github.com/chrismessina/raycast-cosign/stargazers)

**Look up people and companies on Cosign, with their funding, investors and open roles, without leaving Raycast.**

[Features](#features) • [Requirements](#requirements) • [Quick Start](#quick-start) • [Usage](#usage) • [Known Issues](#known-issues)

</div>

---

## Features

- **Search by name, handle or topic.** Searches run when you press Enter, because Cosign rate limits its search tools.
- **Full profiles in the sidebar.** Experience, cosigns, founders and people for a company, loaded as you move through results.
- **Funding and investors.** A company's rounds, its investors grouped by round with a round filter, and an investor's portfolio.
- **Open roles.** A company's open jobs, with an explicit Load More.
- **Favorites.** Star people and companies into two private Cosign lists, so they also show up in the Cosign web app.
- **Recent searches.** Shown when a command opens, removable one at a time.

---

## Requirements

- [Raycast](https://www.raycast.com/) installed
- A [Cosign](https://cosign.co) account. The first command you run opens a sign-in window.

---

## Quick Start

1. Open Raycast and search for **"Search Companies"**
2. Sign in to Cosign when the window opens. Raycast keeps the token afterward.
3. Type a company name and press Enter, then press ⌘K for its funding, investors and open roles.

---

## Usage

### Commands

| Command                 | Mode   | Description                                   |
| ----------------------- | ------ | --------------------------------------------- |
| Search People           | `view` | Search Cosign for people by name or handle    |
| Search Companies        | `view` | Search Cosign for companies and firms by name |
| Find Companies by Topic | `view` | Discover companies by what they do            |
| My Favorites            | `view` | People and companies you starred from Raycast |

### Actions

| Action                                   | Shortcut                        | Description                                                               |
| ---------------------------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| Add to Favorites / Remove from Favorites | `⇧ ⌘ F` (`⌘ ⏎` in My Favorites) | Star or unstar the selected person or company                             |
| Show / Hide Sidebar                      | `⇧ ⌘ D`                         | Show or hide the profile sidebar in search results                        |
| Show / Hide Description                  | `⇧ ⌘ Y`                         | Give the markdown description the whole pane by hiding the metadata table |

Windows uses `Ctrl` in place of `⌘`.

### Preferences

| Preference      | Values   | Default |
| --------------- | -------- | ------- |
| Verbose Logging | checkbox | off     |

---

## Known Issues

- **Investor firms can't be favorited.** Cosign treats investing firms as organizations everywhere else
  (they have profiles, appear as investors, and have portfolios), but its companies list refuses them:
  `add_list_item` fails with "Investing firms are not eligible for this list." No other list kind
  (people, jobs, products) fits a firm, so the extension can't save one. This is a Cosign rule, not an extension bug.
- **Topic search is capped at 300 results, 10 per request.** The count shown ("20 of 300") is the cap on ranked
  results, not the number of companies that match. Each "Load 10 More" press spends one call from Cosign's shared
  search budget (3 per minute, 20 per hour, 60 per day).
- **Funding History shows the first page only.** A company with more rounds than one page returns a cursor that the
  extension does not follow yet, so older rounds can be missing.
- **Avatars are missing in some submenus.** Founders, People, Investors and Cosigned lists don't carry image URLs.
- **Community lists can be found but not opened.** `search_lists` returns Cosign's community lists (the "Startup of the
  Year" lists) with a `questionId`, but `get_list` rejects that id and `read_cosign_link` doesn't resolve their URLs,
  so their members can't be read.
- **No Follow or Claim.** Cosign's MCP has no tool to follow or claim a company, so the extension can't offer those actions.

---

MIT © [Chris Messina](https://github.com/chrismessina)
