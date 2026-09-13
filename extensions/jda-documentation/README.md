# JDA Documentation

A Raycast extension that searches the entire [JDA](https://docs.jda.wiki/) Javadoc and the [JDA wiki](https://jda.wiki/) and renders both inside Raycast — every class, interface, enum, method, field, constructor, event and exception, plus every guide section and FAQ answer, with descriptions, signatures, parameters and code examples, without opening a browser.

Looking up `Guild.retrieveMemberById` or remembering which gateway intent `MessageReceivedEvent` needs usually means leaving your editor, loading a Javadoc page and scrolling to the right anchor. This extension keeps that lookup one hotkey away, and adds the three things the Javadoc makes you dig for: **which gateway intent an entry requires**, **which permission the bot needs**, and **whether the call returns a request object that does nothing until you queue it**.

## Commands

### Search Documentation

Type any part of a name and the matching entries appear instantly.

- Search is fuzzy, package-aware and token-based: `Guild.retrieve`, `retrievemember` and `retrieve member` all find `Guild.retrieveMemberById`, and `guild member join` finds `GuildMemberJoinEvent` and `ListenerAdapter.onGuildMemberJoin`.
- camelCase is treated as a word boundary, so a multi-word query has to match at the start of a word — `send message` ranks `MessageChannel.sendMessage` first instead of every name that happens to contain those letters.
- Results are ranked by match quality and by how prominent the entry is — a type outranks a field containing the same substring.
- With an empty search bar the list shows your favorites, your recent lookups, and then a browsable index. Pick a section from the dropdown and the empty search bar lists **that whole section** alphabetically.

### Intent, permission and RestAction badges

The mistakes every JDA developer makes at least once are visible directly in the result list:

- **`intent: GUILD_MEMBERS`** — a yellow badge on every entry that needs a gateway intent, with a warning at the top of the detail view. This is why `GuildMemberJoinEvent` never fires.
- **`queue()`** — a blue badge on every call that returns a `RestAction`, `Task` or another deferred request. This is why "nothing happens when I call `sendMessage`".
- **`deprecated`** — a red badge on removed-in-the-next-release API.
- Required permissions are listed in the detail view, so you know a call throws `InsufficientPermissionException` before you ship it.

None of this is a hand-written table. Event intents are resolved by replaying JDA's own `GatewayIntent.fromEvents` rules against the class hierarchy the Javadoc publishes in `overview-tree.html`, and the method badges are read out of the rendered Javadoc, so they stay correct across releases.

### Actions

| Action | Shortcut |
| --- | --- |
| Show Details | <kbd>Enter</kbd> |
| Show Members (types and packages) | <kbd>⌘</kbd><kbd>M</kbd> |
| Show Referenced Entries | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd> |
| Copy Boilerplate | <kbd>⌘</kbd><kbd>B</kbd> |
| Copy Example Code | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>E</kbd> |
| Toggle Preview pane | <kbd>⌘</kbd><kbd>D</kbd> |
| Add to Favorites | <kbd>⌘</kbd><kbd>F</kbd> |
| Open in Browser | <kbd>⌘</kbd><kbd>O</kbd> |
| Copy Qualified Name | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>.</kbd> |
| Copy Import Statement | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>I</kbd> |
| Copy Signature | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>G</kbd> |
| Copy Markdown Link | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>L</kbd> |
| Copy Documentation URL | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>C</kbd> |
| View Source on GitHub | <kbd>⌘</kbd><kbd>⇧</kbd><kbd>O</kbd> |
| Refresh Index | <kbd>⌘</kbd><kbd>R</kbd> |

**Copy Import Statement** produces the line you actually need, resolved to the declaring top-level type — `import net.dv8tion.jda.api.entities.Guild;` whether you are looking at `Guild`, `Guild.Ban` or `Guild.retrieveBan`.

**Copy Boilerplate** produces working code rather than a name. On an event it builds the listener around the real event type:

```java
public class MyListener extends ListenerAdapter
{
    @Override
    public void onMessageReceived(MessageReceivedEvent event)
    {

    }
}
```

It also covers `JDABuilder`, `DefaultShardManagerBuilder`, `EmbedBuilder`, `Commands`, `Button` and `RestAction`. **Copy Example Code** grabs the first Java example out of the entry's own documentation.

**View Source on GitHub** opens the actual file in `discord-jda/JDA`; the path is derived from the package, so it always lands on the right source file.

### Preview pane

<kbd>⌘</kbd><kbd>D</kbd> splits the window: the list on the left, the full rendered documentation for the highlighted entry on the right. Arrow through results and read signatures, return types and required intents without ever pressing <kbd>Enter</kbd>. The choice is remembered between launches.

### Details view

Selecting an entry renders its documentation as Markdown:

- Intent, permission and "must be queued" warnings at the top when they apply.
- The Java signature as a syntax-highlighted code block, including annotations, modifiers, generics and parameter types.
- The full description, with deprecation blocks kept as blockquotes.
- **Returns**, **Parameters**, **Throws**, **See Also** and the other Javadoc note lists.
- Code examples as Java blocks.
- Cross-references rewritten to absolute links.

Raycast cannot intercept a click on a Markdown link, so cross-references open in the browser. To stay inside Raycast, <kbd>⌘</kbd><kbd>⇧</kbd><kbd>R</kbd> lists every entry the current one references and lets you jump straight into it.

### Permissions Calculator

Pick permissions from a searchable list and get, from the same screen:

- the raw permission value,
- `EnumSet.of(Permission.MESSAGE_SEND, Permission.MANAGE_ROLES)`,
- `member.hasPermission(...)` for the check,
- a ready bot invite URL with those permissions and both scopes.

The 53 constants and their bit offsets are generated from JDA's own `Permission.java`, so the value matches what the library computes, and each row shows whether the permission applies at guild or channel scope. Set your **Application ID** in preferences and the invite URL is complete; leave it empty and it uses a placeholder. The selection is remembered between launches.

### Embed Builder

A form for title, description, colour, author, footer, thumbnail, image, timestamp and fields, which copies the matching Java:

```java
MessageEmbed embed = new EmbedBuilder()
        .setTitle("Server Rules")
        .setColor(0x5865F2)
        .addField("Ping", "Pong", true)
        .setFooter("Updated daily")
        .setTimestamp(Instant.now())
        .build();
```

Fields are entered one per line as `name | value | inline`. Quotes and newlines in your text are escaped correctly, and a blank value between two filled ones becomes an explicit `null` so the positional arguments never shift.

### Discord Colours

All 37 Discord palette colours with a swatch, hex and integer value, and copy actions for `new Color(0x5865F2)`, `.setColor(0x5865F2)`, the hex, or the integer.

### Type members

For a class, interface, enum or package, <kbd>⌘</kbd><kbd>M</kbd> opens a searchable list of its own members. Every member has the same actions, so you can go from `Guild` to `Guild.createTextChannel` and read it without going back to the main search.

### Search filters

Filters can be typed straight into the search bar and combined with each other and with a query:

| Filter | Effect |
| --- | --- |
| `@event`, `@method`, `@class`, … | Restrict to one kind of entry |
| `kind:constructor` | The same, spelled out |
| `section:audio` | Restrict to a section (`core`, `events`, `interactions`, `requests`, `audio`, `utils`, `guide`) |
| `intent:members` | Only entries that require that gateway intent |
| `perm:ban_members` | Only entries that require that permission |
| `package:entities` | Only entries from a matching package |
| `faq:` | Only FAQ and troubleshooting answers |

`intent:members @event` lists exactly the events that will silently never fire without the members intent. A filter on its own, with no search text, lists everything it matches.

### Guides and FAQ

The JDA wiki is indexed alongside the Javadoc: every section of every guide — getting started, interactions, gateway intents and the member cache policy, RestAction, music bots, the v4→v5 migration — plus the FAQ page and the whole troubleshooting page, which is where answers like *"Unknown Interaction"* and *"The provided token is invalid!"* live. They appear under **Guides** and can be isolated with the `faq:` filter.

### Section filter

The dropdown in the search bar narrows everything to one part of the library: **Core API**, **Events**, **Interactions**, **Requests**, **Audio**, **Utilities**, or **Guides**.

## Raycast AI tools

The extension exposes two tools to Raycast AI, so you can ask questions in AI Chat and get answers grounded in the real documentation instead of a guess:

- **Search JDA Documentation** — searches the local index and returns signatures, return types, required intents and permissions, whether the call must be queued, descriptions and examples.
- **Read JDA Documentation Entry** — returns the full documentation for one qualified name, optionally with a type's members.

> `@jda-documentation how do I reply to a slash command with a modal?`

Both read the same on-disk index the commands use, so they work offline for anything already cached and never invent an API that is absent from the results. Raycast AI requires a Raycast Pro subscription.

## How it works

Javadoc publishes a machine-readable search index next to the pages it renders, so the extension does not have to scrape anything to know what exists:

1. **`type-search-index.js`, `member-search-index.js` and `package-search-index.js`** — the Javadoc search indexes. Together they describe every documented package, type and member with its page and anchor. Cached on disk and checked once a day with a conditional request: while the documentation is unchanged that check is three `304` responses and no download. All searching happens locally against that cache, so typing never hits the network.
2. **`overview-tree.html`** — scanned to rebuild the class hierarchy, which is what turns JDA's `GatewayIntent.fromEvents` rules into a per-event intent badge, together with every member page for the method badges. The scan is tied to the revision of the indexes, so it only runs again when a new JDA release is published.
3. **`search/search_index.json` on jda.wiki** — the guide and FAQ index, with the section itself sliced out of the rendered page so sub-headings stay attached to their parent section.
4. **The entry's own page** — fetched when you open an entry. Only the `<section>` that carries the anchor is sliced out at the string level and parsed, because building a DOM for a page the size of `Guild.html` costs about twenty times the memory of one section.

### Offline use

Every page that gets fetched is written to disk compressed — the whole Javadoc and wiki take about 4 MB instead of 30 MB — and every rendered entry is kept in Raycast's cache, so anything you have already opened works with no network at all. **Prefetch All Docs for Offline Use**, in the action panel of the root list, downloads all of it up front — useful before a flight. If a request fails or times out (15 s), the extension falls back to the stored copy instead of failing.

**Refresh Index** checks for a new JDA release right away instead of waiting for the daily check. Unchanged files answer `304`, so a refresh without a new release downloads nothing, and the offline copy is kept either way.

## Preferences

- **Wiki Guides** — whether the jda.wiki guides and the troubleshooting FAQ are indexed alongside the Javadoc. On by default.
- **Primary Action** — whether <kbd>Enter</kbd> opens the details inside Raycast (default) or goes straight to the browser.
- **JDA Variable Name** — whether generated boilerplate uses `jda` (default) or `shardManager`.
- **Application ID** — your bot's application ID, used to build complete invite URLs in the permissions calculator.

## Development

```bash
npm install
npm run dev     # run the extension locally in Raycast
npm run build   # type-check and build
npm run lint    # lint against Raycast's extension rules
```

## Attribution

Documentation content belongs to the [JDA](https://github.com/discord-jda/JDA) project and is fetched live from `docs.jda.wiki` and `jda.wiki`; this extension only indexes and renders it. The icon is JDA's own logo, rebuilt at icon resolution from the project's `logo-transparent.svg` on the brand purple of its round logo. The permission offsets in `src/data/permissions.ts` are generated from JDA's `Permission.java`, and the event intent rules mirror `GatewayIntent.fromEvents`.

JDA has no colour constants of its own — embeds take a plain `java.awt.Color` — so the palette in `src/data/colours.ts` is generated from discord.py's `colour.py`, the canonical machine-readable list of the Discord client palette.

## License

Licensed under the MIT License. See [LICENSE](LICENSE).
