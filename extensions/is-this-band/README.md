# Is This Band...?

A Raycast extension for the **Is This Band...?** family of sites. Find out whether a band is emo, punk, metal, hardcore, or indie without leaving Raycast.

> **Yellowcard is not an emo band.**
>
> I hope to never end up on Ocean Avenue. Also, electric violin.

## Features

- **Search as you type** — results update after a short debounce
- **Five genres in one command** — switch with the dropdown in the search bar
- **Remembers your last genre** between launches
- **Full commentary** in a wrapping detail panel, so long answers aren't truncated
- **Related genres** — see when a band also appears on a sibling site
- **Video links** — show a YouTube thumbnail when a result embeds a clip
- **Tweet to Expedite Ruling** — for unknown bands on sites that offer a prefilled tweet
- **Native actions** — copy the verdict, copy the link, or open the result on the site

## Supported genres

| Genre    | Site                                                      |
| -------- | --------------------------------------------------------- |
| Emo      | [isthisbandemo.com](https://isthisbandemo.com/)           |
| Punk     | [isthisbandpunk.com](https://isthisbandpunk.com/)         |
| Metal    | [isthisbandmetal.com](https://isthisbandmetal.com/)       |
| Hardcore | [isthisbandhardcore.com](https://isthisbandhardcore.com/) |
| Indie    | [isthisbandindie.com](https://isthisbandindie.com/)       |

## Usage

1. Open the command and pick a genre from the dropdown next to the search bar.
2. Type a band name.
3. Read the verdict and commentary in the detail panel.

| Action                     | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| **Copy Verdict**           | Copies the verdict sentence (primary action, press Enter) |
| **Open on ...**            | Opens the result on the matching site                    |
| **Play Video**             | Opens an embedded YouTube clip in the browser            |
| **Tweet to Expedite Ruling** | Opens X with the site's prefilled tweet (unknown bands only) |
| **Copy Link**              | Copies the result URL (`⌘⇧C`)                            |
| **Refresh**                | Fetches the result again (`⌘R`)                          |

## How it works

The sites have no public API, so the extension requests each site's `?band=<name>` page and parses:

- the verdict from the `<h2>`
- the commentary from the `<h4>`
- any related-genre link from the commentary section
- any embedded YouTube video from the commentary section

Results are not cached; each query is fetched fresh. Some sites still use the legacy `twitter.com/home?status=` link for prefilled tweets, so the extension converts that to X's supported `x.com/intent/post?text=` endpoint before opening it.

## Disclaimer

This is an unofficial extension and is not affiliated with the Is This Band...? sites or X.
