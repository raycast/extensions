# Areg

Search Norwegian companies from Raycast and explore open register data from [areg.no](https://areg.no): shareholders, holdings, roles, financials, group structure, announcements, public funding, tenders, patents and trademarks, and transport and financial licences.

No account or API key is needed.

## Commands

| Command | What it does |
| --- | --- |
| **Search Companies** | Search by name or organisation number. Leave the search empty to see favourites and recent companies. |
| **Open Company from Selection** | Opens the company whose org number is in the selected text, or on the clipboard. Good to bind to a hotkey. |

The search accepts an org number in any spelling: `923609016`, `923 609 016` or `NO923609016MVA`.

Search Companies takes a query argument, so you can type `areg equinor` in the root search. To search areg when nothing else matches, add **Search Companies** as a fallback command in Raycast settings.

## Keyboard shortcuts

Every action is in the action panel (`⌘K`) with its shortcut. The same shortcuts work in the search list, the company view and every list that shows companies, such as shareholders or holdings.

| Action | Shortcut |
| --- | --- |
| Show company | `↵` |
| Open on areg.no | `⌘↵` |
| Copy org number | `⌘⇧C` |
| Copy name | `⌥⌘C` |
| Copy name and org number | `⌃⌘C` |
| Copy areg URL | `⌘⇧U` |
| Paste org number into the frontmost app | `⌘⇧V` |
| Shareholders | `⌘⇧S` |
| Holdings | `⌘⇧H` |
| Roles | `⌘⇧R` |
| Financials | `⌘⇧F` |
| Group | `⌘⇧G` |
| Announcements | `⌘⇧A` |
| Ownership history | `⌘⇧Y` |
| Grants | `⌘⇧N` |
| Tenders | `⌘⇧T` |
| Patents and trademarks | `⌘⇧I` |
| Transport licences | `⌘⇧L` |
| Open in Brønnøysundregistrene | `⌘⇧B` |
| Open website | `⌘O` |
| Add to or remove from favourites | `⌘.` |
| Move favourite up or down | `⌥⌘↑` / `⌥⌘↓` |
| Remove from recent | `⌃X` |
| Clear recent companies | `⌃⇧X` |
| Toggle details | `⌘D` |
| Refresh | `⌘R` |
| Open the current list on areg.no | `⌘⇧O` |

## AI

Mention `@areg` in Raycast AI to ask about companies, for example "@areg who owns Sokkel AS?" or "@areg which companies in Bergen had the highest revenue last year?". The tools call areg's public MCP server at `https://areg.no/mcp`, so the answers use the same data as the extension.

## Preferences

- **Language**: English or Norwegian (bokmål) labels and actions. Register data such as industry names and announcement texts is always in Norwegian.
- **Primary Action**: whether `↵` shows the company in Raycast or opens it on areg.no.

## Data

All data comes from areg.no, which collects open data from Brønnøysundregistrene, Aksjonærregisteret, Innovasjon Norge, SkatteFUNN, Støtteregisteret, Doffin, Patentstyret, Statens vegvesen and Finanstilsynet. Figures in financials are in thousands of the reporting currency.
