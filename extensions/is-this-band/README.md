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

## Install from source

This extension isn't published to the Raycast Store yet. Run it locally:

```sh
git clone https://github.com/wiggly-sheets/is-this-band-raycast-extension.git
cd is-this-band-raycast-extension
npm install
npm run dev
```

Raycast will open the extension in development mode. Search for **Is This Band...?** to start.

## Usage

1. Open the command and pick a genre from the dropdown next to the search bar.
2. Type a band name.
3. Read the verdict and commentary in the detail panel.

| Action                     | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| **Copy Verdict**           | Copies the verdict sentence (primary action, press Enter) |
| **Open on ...**            | Opens the result on the matching site                    |
| **Tweet to Expedite Ruling** | Opens X with the site's prefilled tweet (unknown bands only) |
| **Copy Link**              | Copies the result URL (`⌘⇧C`)                            |
| **Refresh**                | Fetches the result again (`⌘R`)                          |

## How it works

The sites have no public API, so the extension requests each site's `?band=<name>` page and parses:

- the verdict from the `<h2>`
- the commentary from the `<h4>`
- any related-genre link from the commentary section

Results are not cached; each query is fetched fresh. Some sites still use the legacy `twitter.com/home?status=` link for prefilled tweets, so the extension converts that to X's supported `x.com/intent/post?text=` endpoint before opening it.

## Development

| Script             | Description                  |
| ------------------ | ---------------------------- |
| `npm run dev`      | Run the extension in Raycast |
| `npm run build`    | Build the extension          |
| `npm run lint`     | Lint the manifest and source |
| `npm run fix-lint` | Auto-fix linting issues      |

### Project structure

```text
src/
  index.tsx       # List UI, genre dropdown, actions, fetch hook
  lib/
    bandsite.ts   # HTTP fetching and HTML parsing
    genres.ts     # Genre and site configuration
assets/
  icon.svg        # Source icon
  extension-icon.png
```

## Publishing to the Raycast Store

When the extension is ready, publish through the Raycast CLI:

```sh
npm run lint
npm run build
npm run publish
```

The publish command forks `raycast/extensions`, copies the extension into the monorepo, and opens a pull request. Make sure the `author` field in `package.json` matches your Raycast username.

## Disclaimer

This is an unofficial extension and is not affiliated with the Is This Band...? sites or X.

## License

[MIT](LICENSE)
