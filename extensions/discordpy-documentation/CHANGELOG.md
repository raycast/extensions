# Discord.py Documentation Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Fuzzy, token-aware search across every class, method, attribute, property, event, exception, guide section and FAQ answer in the discord.py documentation, all matched locally against a cached index.
- Gateway intent badges and a warning in the detail view on every entry whose documentation requires an intent, plus `await` badges on coroutines, both derived from the documentation itself rather than a hand-written table.
- Preview pane that renders the highlighted entry beside the list, and a member browser for classes and exceptions.
- Search filters typed into the search bar: `@event`, `kind:method`, `section:tasks`, `intent:members`, `module:ui` and `faq:`.
- Copy actions for boilerplate, example code, import statements, signatures, qualified names and Markdown links, plus favorites and recent lookups.
- Permissions Calculator command producing the permissions integer, `discord.Permissions(...)`, `@commands.has_permissions(...)` and a bot invite URL.
- Embed Builder command that turns a form into `discord.Embed` code, and a Discord Colours command listing every `discord.Colour` preset with its hex and integer value.
- Two Raycast AI tools so AI Chat can answer discord.py questions from the indexed documentation instead of guessing.
- Offline support: fetched pages and rendered entries are cached on disk, with a Prefetch All Docs action for use without a network.
- Preferences for the documentation version (`stable` or `latest`), the primary action, the bot variable name used in boilerplate, and the application ID used for invite URLs.
