# Cyber Security Pulse

A simple Raycast extension to glance your favourite cyber security sources
without leaving the keyboard — the latest headlines from the feeds you choose,
ranked by severity, one keystroke away. No API keys, no backend, nothing to log
in to.

## What it does

- Pulls curated cyber security RSS feeds (BleepingComputer, The Hacker News,
  Krebs, CISA, Schneier, SANS ISC).
- Classifies each item into 🔴 Critical / 🟠 High / 🟡 Medium / ⚪ Low (highest
  matched tier wins; red is gated to active-exploitation or unauth-RCE signals).
- Shows the highest non-empty tier's top items inline; lower tiers are drill
  rows under **More**.
- Optional **⭐ Watched** section pins news about your priority tech (see below).
- Navigation: <kbd>Enter</kbd> / <kbd>⌘→</kbd> forward (preview → browser),
  <kbd>Esc</kbd> / <kbd>⌘←</kbd> back. <kbd>⌘R</kbd> reloads,
  <kbd>⌘⇧C</kbd> copies the list as markdown, <kbd>⌘⇧A</kbd> opens the full list
  of the focused item's category.

## Severity

Each item is sorted into one tier — the **highest** that matches. Signals are
**not** summed: one Critical signal outranks any number of Medium ones. Matching
is case-insensitive and word-boundary aware (so `RCE` won't match "souRCE"),
checked against the headline and the summary.

| Tier            | Means              | Signals                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🔴 **Critical** | Act now            | An exploitation term **in the title** — `actively exploited`, `active exploitation`, `exploited in the wild`, `in the wild`, `under active attack`, `zero-day`/`0-day`, `wormable`, `exploitation observed`, `being exploited`, `CISA KEV`, `known exploited` — **or** a remote-code-execution term (`remote code execution`, `RCE`) **and** an unauthenticated term (`unauthenticated`, `pre-auth`, `without authentication`, `no authentication`) together (title or body). |
| 🟠 **High**     | Serious            | `ransomware`, `backdoor`, `supply chain`, `CVSS 9`, `CVSS 10`, `RCE`, `privilege escalation`, `data breach`, `exploit`/`exploited`, `proof of concept`/`PoC`.                                                                                                                                                                                                                                                                                                                 |
| 🟡 **Medium**   | Routine vuln/patch | `vulnerability`, `flaw`, `patch`, `security update`, `advisory`, `CVE-`.                                                                                                                                                                                                                                                                                                                                                                                                      |
| ⚪ **Low**      | Everything else    | None of the above matched.                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

Within a tier, items are ordered by the **sort dropdown** in the search bar —
**Newest first** (default) or **By criticality** (signal strength); the choice
persists. Tiers themselves always stay ordered by severity. **Critical is gated
to the title** (plus the RCE-and-unauthenticated combo) on purpose: roundup posts
that merely mention exploits in their body don't get over-flagged. Promotional
titles (webinars, whitepapers, e-books, "register now", "sponsored", on-demand,
livestreams) are kept out of Critical even when they mention "zero-day" etc.

The built-in signal lists live in `src/lib/score.ts`. You can also add your own
per tier without touching code, via the **Extra Critical / High / Medium
Keywords** preferences (comma-separated). These _add_ to the built-ins; the
defaults always apply. Extra Critical keywords match anywhere (title or body),
so e.g. setting `Citrix, our-product` flags any mention as 🔴 Critical.

## Feeds

Sources are editable in **Settings → Extensions → Cyber Security Pulse → Feed Sources**.
The field starts pre-filled with the curated set; add or remove entries:

```
Name|https://example.com/feed, https://another.com/rss
```

Comma separates entries; each is `Name|url` or a bare `url` (name derived from
the host). Only `http(s)` URLs are used. Clearing the field restores the default
set.

## Watchlist

Set the **Priority Watchlist** preference to pin matching news on top. In
Raycast: **Settings → Extensions → Cyber Security Pulse → Priority Watchlist**.

```
Linux|kernel, Microsoft|windows, pkg:npm/express, OpenSSL
```

Comma separates entries, `|` separates aliases, and a `pkg:` token is a PURL
whose package/namespace are added as aliases. Empty = no Watched section.

## Denylist

Set the **Denylist** preference to hide topics you don't care about. Any item
whose title or summary matches a keyword is removed from the list (tiers, Watched,
and the copied markdown).

```
Android, crypto, conference
```

Comma-separated, word-boundary matched. Empty = nothing hidden.

## Develop

```bash
npm install
npm run dev      # loads the command into Raycast in dev mode
```

`npm run dev` keeps running and hot-reloads. The command shows up in Raycast as
**Cyber Security Pulse** while it runs.

## Tuning

- **Feeds:** set the Feed Sources preference (no code needed); defaults live in `src/lib/feeds.ts`.
- **Severity signals / tiers:** edit `src/lib/score.ts`.
- **Watchlist:** set the Priority Watchlist preference (no code needed).

## Architecture

See the ADRs in `docs/architecture/adrs/` (0001 base, 0002 severity, 0003 list
UX, 0004 watchlist, 0005 KEV titles, 0006 security hardening, 0007 configurable
feeds, 0008 extra severity keywords, 0009 denylist, 0010 promo demotion + date
sort, 0011 sort toggle).

Security posture (trust boundary, threats, mitigations): see [SECURITY.md](SECURITY.md).

## About

Built by [Metavoli](https://metavoli.no). The `/m/` mark in the icon is
Metavoli's wordmark — the phonetic spelling of the name — here paired with a red
pulse for the live security feed.
