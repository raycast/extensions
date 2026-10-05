# JDA Documentation Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Fuzzy, camelCase-aware search across every package, type, method, field, constant, constructor, event and exception in the JDA Javadoc, plus every jda.wiki guide section and FAQ answer, all matched locally against a cached index.
- Gateway intent badges and a warning in the detail view on every entry that needs an intent, `queue()` badges on calls that return a `RestAction` or `Task`, deprecation badges, and required permissions in the detail view — all derived from the documentation and from JDA's own `GatewayIntent.fromEvents` rules rather than a hand-written table.
- Preview pane that renders the highlighted entry beside the list, and a member browser for types and packages.
- Search filters typed into the search bar: `@event`, `kind:method`, `section:audio`, `intent:members`, `perm:ban_members`, `package:entities` and `faq:`.
- Copy actions for boilerplate, example code, import statements, signatures, qualified names and Markdown links, a direct View Source on GitHub link, plus favorites and recent lookups.
- Permissions Calculator command producing the raw permission value, `EnumSet.of(Permission...)`, a `hasPermission` check and a bot invite URL.
- Embed Builder command that turns a form into `EmbedBuilder` code, and a Discord Colours command listing the palette with its hex and integer values.
- Two Raycast AI tools so AI Chat can answer JDA questions from the indexed documentation instead of guessing.
- Offline support: fetched pages and rendered entries are cached on disk, with a Prefetch All Docs action for use without a network.
- Preferences for indexing the wiki guides, the primary action, the JDA variable name used in boilerplate, and the application ID used for invite URLs.
