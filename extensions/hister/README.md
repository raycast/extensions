# Hister

Search the full text of every page you've visited, using your own [Hister](https://hister.org) server.

## Setup

Run a Hister server with its browser extension installed, so it saves the pages you visit. See the [Hister quickstart](https://hister.org/docs/quickstart). Then set these in the extension preferences.

- **Server URL** (required): where Hister runs. The default, `http://127.0.0.1:4433`, is where `hister listen` runs locally.
- **Access Token** (optional): the `app.access_token` from your Hister config, or your profile's token on a multi-user server.

## Features

- Search with Hister's query syntax, like `"exact phrase"`, `domain:github.com`, `updated:<7d` or `-domain:reddit.com`
- Sort by relevance, newest, oldest, or most visited
- See the matching text and page details beside each result
- Read the copy of a page Hister stored
- Recent searches on the first screen, and pinned searches above them
- Search the site in your current browser tab
- Delete a page, or stop indexing a page, a site, or a pattern
- Manage indexing rules and aliases, with how many pages each rule matches

## FAQ

**Why isn't my search in Recent Searches?**

A search is saved once you've stayed on it for 3 seconds, or when you open a result from it in Raycast or Hister's web page.

**What does the pin icon on a result mean?**

The page was pinned to this exact search in Hister's web page, so it always comes first for it. The search has to match exactly, capitalisation included.

**Why don't I see "Search example.com" or "Add example.com"?**

Those actions use the page open in your browser, which needs Raycast's browser extension installed and turned on. With several browser windows open, reload a tab that was already open before you turned the extension on.

**What's an alias?**

A keyword Hister swaps for a longer query before searching. With `gh` set to `domain:github.com`, searching `gh raycast` searches `domain:github.com raycast`. Add one with Add Alias (⌘N).

## AI Tools

- **Search Pages**: search the pages you've visited
- **Read Page**: the copy of one page Hister stored
