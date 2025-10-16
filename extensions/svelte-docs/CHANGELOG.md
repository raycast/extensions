# Svelte Docs Changelog

## [Improve AI command to search the svelte docs] - 2025-04-24

The AI command now is more explicit in the query request avoiding common words that would return bad results. In case the returned dataset is too large it will also slim down the output until it's a decent size to prevent failing for a message too big. I've also moved the evals to `ai.json` to de-clutter the `package.json`

## [AI command to search the svelte docs] - 2025-04-19

Adds a new AI tool to the svelte extension, allowing users to query the svelte docs through LLMs

## [Support for new Svelte Omnisite] - 2021-11-04

The new Svelte Omnisite is live and with it the docs are all in one neat place. As of today the extension is updated to fetch from the right place and link to the right place. And even better, you now have the ability to search for the docs of the CLI too, as well as take a look at the Tutorial or some example REPL...all with a couple of clicks within Raycast!

## [Initial Version] - 2024-01-08
