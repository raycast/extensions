# Folia Documentation

A Raycast extension that searches the entire [Folia](https://jd.papermc.io/folia/) Javadoc and the [Folia guides on docs.papermc.io](https://docs.papermc.io/folia/) and renders both inside Raycast — every class, interface, enum, method, field, constructor, event and exception, plus the administration guide, API reference pages and FAQ, with descriptions, signatures and code examples, without opening a browser.

Folia forks Paper to split the world into independently ticking regions, and that single change quietly breaks a lot of code a Paper plugin author already knows by heart: `Bukkit.getScheduler().runTaskLater(...)` throws `UnsupportedOperationException`, and touching a block or entity from the wrong thread throws too. This extension keeps the Javadoc lookup one hotkey away and puts the thing the docs don't say loudly enough front and center — **which scheduler actually works on Folia, and which classic Bukkit API silently doesn't**.

## Commands

### Search Documentation

Type any part of a name and the matching entries appear instantly.

- Search is fuzzy, package-aware and token-based: `Player.getSched`, `getregionscheduler` and `get region scheduler` all find `Player.getScheduler`, and `player join` finds `PlayerJoinEvent`.
- camelCase is treated as a word boundary, so a multi-word query has to match at the start of a word.
- Results are ranked by match quality and by how prominent the entry is — a type outranks a field containing the same substring.
- With an empty search bar the list shows your favorites, your recent lookups, and then a browsable index. Pick a section from the dropdown and the empty search bar lists **that whole section** alphabetically.

### Folia-safety badges

- **`not on Folia`** — an orange badge, with a warning at the top of the detail view, on every `org.bukkit.scheduler` entry. Most of `BukkitScheduler`'s methods throw `UnsupportedOperationException` on a regionised server; this is why `runTaskLater` "randomly" crashes a plugin that worked fine on Paper.
- **`deprecated`** — a red badge, read straight out of the Javadoc's own `deprecated-list.html` rather than a hand-written table, so it never drifts from the actual API. Deprecated entries are also pushed to the end of same-rank browse and member lists instead of leading them alphabetically — `co.aikar.timings.*` (almost entirely deprecated) otherwise dominates the top of an empty search purely because "co" sorts before "io"/"org".

### BukkitScheduler → Folia migration

Opening any `BukkitScheduler` method (`runTask`, `runTaskLater`, `runTaskTimer`, or their `*Asynchronously` variants) adds a **Folia Equivalent** section to its detail view and a **Folia Migration** action group with one **Copy as _Scheduler_** action per real replacement, built from the actual signatures rather than a single guessed answer:

- The `*Asynchronously` methods map one-to-one onto `AsyncScheduler` (they never touched world/entity state to begin with), with the tick-to-real-time conversion already done.
- The synchronous methods carry no information about what the task itself touches, so all three region-aware options are offered — `GlobalRegionScheduler`, `RegionScheduler`, `EntityScheduler` — with guidance on which one actually fits.

### Actions

| Action | Shortcut |
| --- | --- |
| Show Details | <kbd>Enter</kbd> |
| Show Members (types and packages) | <kbd>⌘</kbd><kbd>M</kbd> |
| Show Referenced Entries | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd> |
| Copy Boilerplate | <kbd>⌘</kbd><kbd>B</kbd> |
| Copy Example Code | <kbd>⌘</kbd><kbd>E</kbd> |
| Toggle Preview pane | <kbd>⌘</kbd><kbd>D</kbd> |
| Add to Favorites | <kbd>⌘</kbd><kbd>F</kbd> |
| Open in Browser | <kbd>⌘</kbd><kbd>O</kbd> |
| Copy Qualified Name | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>.</kbd> |
| Copy Import Statement | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>I</kbd> |
| Copy Signature | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>S</kbd> |
| Copy Markdown Link | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>L</kbd> |
| Copy Documentation URL | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>C</kbd> |
| Search Source on GitHub | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>O</kbd> |
| Refresh Index | <kbd>⌘</kbd><kbd>R</kbd> |

**Copy Boilerplate** produces working code rather than a name. On an event it builds a listener around the real event type:

```java
public class MyListener implements Listener
{
    @EventHandler
    public void onPlayerJoin(PlayerJoinEvent event)
    {

    }
}
```

It also covers `JavaPlugin`, `PluginManager.registerEvents`, and every scheduler in the Scheduler Cheatsheet below. **Copy Import Statement** resolves to the declaring top-level type — `import org.bukkit.entity.Player;` whether you are looking at `Player`, `Player.Spigot` or `Player.getScheduler`.

**Search Source on GitHub** opens a GitHub code search instead of a direct file link: Folia's own repository patches Paper's build system rather than storing plain `.java` files, so there is no reliable path to a source file, and a wrong "source" link is worse than an honest search.

### Preview pane and details view

<kbd>⌘</kbd><kbd>D</kbd> splits the window: the list on the left, the full rendered documentation for the highlighted entry on the right. Selecting an entry renders its documentation as Markdown, with the Folia-safety warning at the top when it applies, the Java signature as a syntax-highlighted block, the full description, **Returns**, **Parameters**, **Throws** and the other Javadoc note lists, and code examples. Cross-references are rewritten to absolute links; <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd> lists every entry the current one references and lets you jump straight into it without leaving Raycast.

### Type members

For a class, interface, enum or package, <kbd>⌘</kbd><kbd>M</kbd> opens a searchable list of its own members.

### Search filters

Filters can be typed straight into the search bar and combined with each other and with a query:

| Filter | Effect |
| --- | --- |
| `@event`, `@method`, `@class`, … | Restrict to one kind of entry |
| `kind:constructor` | The same, spelled out |
| `section:scheduler` | Restrict to a section (`scheduler`, `events`, `entities`, `inventory`, `core`, `paper`, `utils`, `guide`) |
| `package:threadedregions` | Only entries from a matching package |
| `faq:` | Only FAQ answers |

### Guides and FAQ

The Folia guide site is indexed alongside the Javadoc: the introduction, the administration guide and its reference page, the API reference (region logic and the general overview), and every FAQ question. They appear under **Guides** and can be isolated with the `faq:` filter.

### Section filter

The dropdown in the search bar narrows everything to one part of the API: **Region Scheduler**, **Events**, **Entities**, **Inventory**, **Core API**, **Paper API**, **Utilities**, or **Guides**.

### Scheduler Cheatsheet

A second command dedicated to the four APIs that replace `BukkitScheduler` on Folia, each with what it's for, when to use it over the others, and a real, compiling example built from the actual method signatures:

- **`GlobalRegionScheduler`** (`Bukkit.getGlobalRegionScheduler()`) — logic tied to no location: server shutdown, config reloads.
- **`RegionScheduler`** (`Bukkit.getRegionScheduler()`) — logic tied to a `Location` or a chunk: placing a block, spawning particles.
- **`EntityScheduler`** (`entity.getScheduler()`) — logic tied to one entity, following it across regions as it moves.
- **`AsyncScheduler`** (`Bukkit.getAsyncScheduler()`) — logic that must not block a tick thread at all: HTTP calls, database queries.

A fifth entry explains exactly why `BukkitScheduler` itself isn't in that list. <kbd>⌘</kbd><kbd>E</kbd> copies the example, <kbd>⌘</kbd><kbd>⇧</kbd><kbd>A</kbd> copies just the accessor line.

### Scheduler Code Builder

A third command turns the same four APIs into a form instead of a cheatsheet: pick a **Scope** (Global Region, Location/Block, Entity/Player, or Async), a **Timing** (Now, Delayed, or Fixed Rate), fill in the delay/period and the variable names you actually use, and copy or preview the exact, compiling Java call.

- Scope and timing decide the method and parameter order for real — an Entity scope adds the optional "retired" callback parameter only `EntityScheduler` has, and an Async scope switches the delay/period fields to a real `TimeUnit` (milliseconds, seconds or minutes) instead of ticks, because that is genuinely how the underlying signatures differ.
- The Region scope defaults to the `Location` overload; `RegionScheduler` also has a `World` + chunk-coordinate overload, noted in the field's help text rather than silently hidden.

### Dependency Copier

Two actions in the root list resolve the correct `dev.folia:folia-api` Maven coordinate for whichever **Folia Version** is selected in preferences (querying PaperMC's own repository metadata for the always-moving `26.2` build rather than shipping a version number that would go stale) and copy a ready `repositories { }` / `dependencies { }` block:

| Action | Shortcut |
| --- | --- |
| Copy Gradle Kotlin Dependency | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>G</kbd> |
| Copy Maven Dependency | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>M</kbd> |

## Raycast AI tools

The extension exposes three tools to Raycast AI, so you can ask questions in AI Chat and get answers grounded in the real documentation instead of a guess:

- **Search Folia Documentation** — searches the local index and returns signatures, deprecation status, whether an API is unsupported on Folia, descriptions and examples.
- **Read Folia Documentation Entry** — returns the full documentation for one qualified name, optionally with a type's members.
- **Migrate BukkitScheduler Call to Folia** — given a legacy scheduler method name, returns the real Folia equivalents and picking guidance from the same data the Folia Migration action uses.

> `@folia-documentation how do I run code every tick for a specific player?`
>
> `@folia-documentation convert this runTaskTimer call to Folia`

Both read the same on-disk index the commands use, so they work offline for anything already cached and never invent an API that is absent from the results. Raycast AI requires a Raycast Pro subscription.

## How it works

Javadoc publishes a machine-readable search index next to the pages it renders, so the extension does not have to scrape anything to know what exists:

1. **`type-search-index.js`, `member-search-index.js` and `package-search-index.js`** — the Javadoc search indexes for the selected Folia version, filtered to the documented `org.bukkit`, `io.papermc.paper`, `com.destroystokyo.paper`, `org.spigotmc` and `co.aikar` packages. Cached on disk for 24 hours; all searching happens locally against that cache, so typing never hits the network. Only `page` and `anchor` are stored per entry — the full URL is derived on demand instead of duplicated ~33,000 times, which keeps the cache file well under half the size it would otherwise be.
2. **`deprecated-list.html`** — scanned once per day per version to build the deprecated badge, matched by the exact page and anchor the search index already uses.
3. **`docs.papermc.io/folia/`** — the guide site, sliced into one entry per `<h2>` section so a sub-heading stays attached to its guide rather than becoming a wall of text.
4. **The entry's own page** — fetched when you open an entry. Only the `<section>` that carries the anchor is sliced out at the string level and parsed, because building a DOM for a page the size of `Player.html` costs about twenty times the memory of one section.

### Offline use

Every page that gets fetched is written to disk, and every rendered entry is kept in Raycast's cache, so anything you have already opened works with no network at all. **Prefetch All Docs for Offline Use**, in the action panel of the root list, downloads all of it up front. If a request fails or times out (15 s), the extension falls back to the stored copy instead of failing.

**Refresh Index** re-downloads the indexes and rebuilds the badges before the 24-hour cache expires, for example after a new Folia build.

## Preferences

- **Folia Version** — which Javadoc build to index and search: `26.2` (default, latest), `26.1.2`, or `1.21.11`. These are the only three builds jd.papermc.io actually publishes a Javadoc for.
- **PaperMC Guides** — whether the guide site is indexed alongside the Javadoc. On by default.
- **Primary Action** — whether <kbd>Enter</kbd> opens the details inside Raycast (default) or goes straight to the browser.

## Development

```bash
npm install
npm run dev     # run the extension locally in Raycast
npm run build   # type-check and build
npm run lint    # lint against Raycast's extension rules
```

## Attribution

Documentation content belongs to the [Folia](https://github.com/PaperMC/Folia) project and is fetched live from `jd.papermc.io` and `docs.papermc.io`; this extension only indexes and renders it. The scheduler examples in `src/data/scheduler.ts` are written from the real method signatures published in the Folia Javadoc, not guessed.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
