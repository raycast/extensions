# Quick Search

Query **Perplexity**, **Google**, **Google AI Mode**, **DuckDuckGo**, **Bing**, **YouTube**, or custom engines instantly from Raycast — with live autocomplete suggestions, multi-search, and recent searches. No account, sign-in, or API key required.

## Features

- **Quick Search** command: type a query and press `↵` to open it in your chosen engine in the default browser.
- **Multi-Search**: search across multiple engines simultaneously in order (e.g., Google and Perplexity opened as separate browser tabs at the same time).
- **Quick Toggle & Reorder**: quickly turn Multi-Search on/off with `⌘` `M` and customize the exact tab opening order in the *Configure Multi-Search* settings (`⌘` `⇧` `M`).
- **Engine switcher**: switch engines from the search bar dropdown. Your last choice is remembered.
- **Custom Search Engines**: add, edit, or remove your own search engines (e.g. GitHub, Brave, Yahoo).
- **Live suggestions** while you type, powered by keyless public suggestion endpoints. Suggestions degrade gracefully when offline — the plain search row always works.
- **Recent searches** appear when the search bar is empty. Remove a single entry with `⌃` `X` or clear everything with `⌃` `⇧` `X`.
- **Open With …**: run the same query against any other engine via `⌘` `1`–`⌘` `9` without changing the active engine.
- **Fallback command**: enable *Quick Search* as a fallback to search whatever you typed in root search — see below.

## Multi-Search

Multi-Search allows you to send a single search query to multiple search engines at once, opening each search result as a browser tab in your specified order.

- **Turn On / Off**: Press `⌘` `M` in the search view to toggle Multi-Search mode.
- **Configure Engines & Tab Order**: Open *Configure Multi-Search…* (`⌘` `⇧` `M`) to select which search engines are included and reorder them up/down to set the exact browser tab order.

## Use as a Fallback Command

Add Quick Search to Raycast's fallback commands to search anything you type in root search in one step:

1. Open Raycast root search, press `⌘` `K`, and choose **Manage Fallback Commands** (or Raycast Settings → Advanced → Fallback Commands).
2. Enable **Quick Search**.

Now type any query in root search (e.g. "how tall is an average rabbit"), pick *Quick Search* from the fallback list, and the browser opens instantly with your last-used engine (or Multi-Search engines if enabled) — no extra `↵`. Prefer to land in the extension UI with the query prefilled instead? Turn off *Search immediately when used as a fallback command* in the extension preferences.

Raycast doesn't let extensions enable fallback commands automatically — it's a one-time manual step.

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| Default Search Engine | Google | Engine preselected on first use. Afterwards the search bar dropdown remembers your last selection. |
| Remember recent searches | On | Shows your recent searches when the search bar is empty. History is stored locally in Raycast's encrypted storage and never leaves your device. Turning the preference off hides history; *Clear History* deletes it. |
| Search immediately when used as a fallback command | On | Fallback launches open the browser instantly with the last-used engine (or Multi-Search engines if enabled). Turn off to prefill the query in the search bar instead. |

## Privacy

- No analytics, no tracking, no accounts.
- Search history and custom settings stay on-device (Raycast encrypted LocalStorage).
- The only network calls are the suggestion endpoints for the text you type.
