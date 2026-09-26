# Discord.py Documentation

A Raycast extension that searches the entire [discord.py](https://discordpy.readthedocs.io/en/stable/) documentation and renders it inside Raycast — every class, method, attribute, property, event and exception, with descriptions, signatures, parameters and code examples, without opening a browser.

Looking up `Client.wait_for` or remembering which intent `on_member_join` needs usually means leaving your editor, loading a large documentation page and scrolling to the right anchor. This extension keeps that lookup one hotkey away, and adds the two things the documentation makes you dig for: **which gateway intent an entry requires**, and **whether it has to be awaited**.

## Commands

### Search Documentation

Type any part of a name and the matching entries appear instantly.

- Search is fuzzy, dot-aware and token-based: `Client.wait`, `waitfor` and `wait for` all find `Client.wait_for`, and `guild channel` finds `GuildChannel` and the `on_guild_channel_*` events.
- Multi-word queries require every word to match at a name boundary, so `on message` ranks `on_message` first instead of every attribute that happens to contain the letters.
- Results are ranked by match quality and by how prominent the entry is — a class outranks an attribute containing the same substring.
- With an empty search bar the list shows your favorites, your recent lookups, and then a browsable index. Pick a section from the dropdown and the empty search bar lists **that whole section** alphabetically.

### Intent and coroutine badges

The two mistakes every discord.py developer makes at least once are visible directly in the result list:

- **`intent: members`** — a yellow badge on every entry whose documentation says it needs a gateway intent, with a warning at the top of the detail view. This is why `on_member_join` never fires.
- **`await`** — a blue badge on every coroutine, so you know a call has to be awaited without opening it.

Both are derived from the documentation itself rather than a hand-written table, so they stay correct across releases. The index currently finds 629 entries that need one badge or the other.

### Actions

| Action | Shortcut |
| --- | --- |
| Show Details | <kbd>Enter</kbd> |
| Show Members (classes and exceptions) | <kbd>⌘</kbd><kbd>M</kbd> |
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

**Copy Import Statement** produces the line you actually need — `from discord import Embed`, `from discord.ext import commands`, `from discord.ui import Button`.

**Copy Boilerplate** produces working code rather than a name. On an event it builds the handler from the event's real signature and annotates the parameters it recognises:

```python
@bot.event
async def on_message(message: discord.Message):
    if message.author.bot:
        return

    await bot.process_commands(message)
```

It also covers `app_commands.command`, `commands.command` and `tasks.loop`. **Copy Example Code** grabs the first Python example out of the entry's own documentation.

### Preview pane

<kbd>⌘</kbd><kbd>D</kbd> splits the window: the list on the left, the full rendered documentation for the highlighted entry on the right. Arrow through results and read signatures and parameters without ever pressing <kbd>Enter</kbd>. The choice is remembered between launches.

### Details view

Selecting an entry renders its documentation as Markdown:

- An intent warning at the top when one applies.
- The Python signature as a syntax-highlighted code block, including `await`, positional-only markers and default values.
- The full description, with `Note` and `Warning` admonitions kept as blockquotes and *Changed in version* notices preserved.
- **Parameters**, **Returns**, **Return type** and **Raises** field lists.
- Code examples as Python blocks.
- Cross-references rewritten to absolute links.

Raycast cannot intercept a click on a Markdown link, so cross-references open in the browser. To stay inside Raycast, <kbd>⌘</kbd><kbd>R</kbd> lists every entry the current one references and lets you jump straight into it.

### Permissions Calculator

Pick permissions from a searchable list and get, from the same screen:

- the permissions integer,
- `discord.Permissions(send_messages=True, manage_roles=True)`,
- `@commands.has_permissions(...)` for the decorator form,
- a ready bot invite URL with those permissions and both scopes.

The 52 flags and their bit positions are generated from discord.py's own `permissions.py`, so the integer matches what the library computes. Set your **Application ID** in preferences and the invite URL is complete; leave it empty and it uses a placeholder. The selection is remembered between launches.

### Embed Builder

A form for title, description, colour, author, footer, thumbnail, image, timestamp and fields, which copies the matching Python:

```python
embed = discord.Embed(
    title="Server Rules",
    colour=discord.Colour.blurple(),
    timestamp=discord.utils.utcnow(),
)
embed.add_field(name="Ping", value="Pong", inline=True)
embed.set_footer(text="Updated daily")
```

Fields are entered one per line as `name | value | inline`. Quotes and newlines in your text are escaped correctly.

### Discord Colours

All 37 `discord.Colour` presets with a colour swatch, hex and integer value, and copy actions for `discord.Colour.blurple()`, the hex, the integer, or `discord.Colour(0x5865F2)`.

### Class members

For a class or exception, <kbd>⌘</kbd><kbd>M</kbd> opens a searchable list of its own attributes, properties and methods. Every member has the same actions, so you can go from `Guild` to `Guild.create_text_channel` and read it without going back to the main search.

### Search filters

Filters can be typed straight into the search bar and combined with each other and with a query:

| Filter | Effect |
| --- | --- |
| `@event`, `@method`, `@class`, … | Restrict to one kind of entry |
| `kind:property` | The same, spelled out |
| `section:tasks` | Restrict to a section (`core`, `events`, `app_commands`, `commands`, `tasks`, `guide`) |
| `intent:members` | Only entries that require that gateway intent |
| `module:ui` | Only entries from that module |
| `faq:` | Only FAQ answers |

`intent:members @event` lists exactly the events that will silently never fire without the members intent. A filter on its own, with no search text, lists everything it matches.

### FAQ

The 23 questions from the documentation's FAQ page are indexed alongside the API, so *"Why does on_message make my commands stop working?"* is one search away and its answer, including the code fix, renders inside Raycast. They appear under **Guides** and can be isolated with the `faq:` filter.

### Section filter

The dropdown in the search bar narrows everything to one part of the library: **Core API**, **Events** (the 105 `on_*` gateway events, otherwise buried in the middle of the API reference), **App Commands**, **ext.commands**, **ext.tasks**, or **Guides**.

## Raycast AI tools

The extension exposes two tools to Raycast AI, so you can ask questions in AI Chat and get answers grounded in the real documentation instead of a guess:

- **Search Discord.py Documentation** — searches the local index and returns signatures, required intents, coroutine flags, descriptions and examples.
- **Read Discord.py Documentation Entry** — returns the full documentation for one qualified name, optionally with a class's members.

> `@discordpy-documentation how do I let a user pick several options in a SelectMenu?`

Both read the same on-disk index the commands use, so they work offline for anything already cached and never invent an API that is absent from the results. Raycast AI requires a Raycast Pro subscription.

## How it works

There is no JSON API for discord.py the way there is for discord.js, so the extension uses the artefacts Sphinx already publishes:

1. **`objects.inv`** — the intersphinx inventory, a ~31 KB zlib-compressed index of every documented object with its page and anchor. Its 4932 raw entries become 4484 after dropping changelog/migration anchors and collapsing the 361 module aliases Sphinx emits (`discord.Embed` and `discord.embeds.Embed` point at the same anchor). Cached on disk for 24 hours; all searching happens locally against that cache, so typing never hits the network.
2. **The API reference pages** — scanned once per day to build the intent and coroutine index.
3. **The entry's own page** — fetched when you open an entry, parsed with `node-html-parser`, and the block for that anchor converted to Markdown.

### Offline use

Every page that gets fetched is written to disk, and every rendered entry is kept in Raycast's cache, so anything you have already opened works with no network at all. **Prefetch All Docs for Offline Use**, in the action panel of the root list, downloads all of it up front — useful before a flight. If a request fails or times out (15 s), the extension falls back to the stored copy instead of failing.

**Refresh Index** re-downloads the inventory and rebuilds the badge index before the 24-hour cache expires, for example after a new discord.py release.

## Preferences

- **Documentation Version** — index the `stable` release branch (default) or `latest`, the master branch, where the newer Discord features land first. Each version keeps its own cache.
- **Primary Action** — whether <kbd>Enter</kbd> opens the details inside Raycast (default) or goes straight to the browser.
- **Bot Variable Name** — whether generated boilerplate uses `bot` (default, for `commands.Bot`) or `client` (for `discord.Client`).
- **Application ID** — your bot's application ID, used to build complete invite URLs in the permissions calculator.

## Development

```bash
npm install
npm run dev     # run the extension locally in Raycast
npm run build   # type-check and build
npm run lint    # lint against Raycast's extension rules
```

## Attribution

Documentation content belongs to the [discord.py](https://github.com/Rapptz/discord.py) project and is fetched live from Read the Docs; this extension only indexes and renders it. The icon is discord.py's own logo, taken from the documentation's `snake.svg` and `snake_dark.svg` with the background window artwork removed, which is why it follows your Raycast theme. The permission bits in `src/data/permissions.ts` and the colour values in `src/data/colours.ts` are generated from discord.py's own source.

Note that the documentation carries no `[source]` links, so there is no way to build a line-accurate GitHub link for an entry. **Search Source on GitHub** runs a repository-scoped code search for the definition instead, which always lands on it.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
