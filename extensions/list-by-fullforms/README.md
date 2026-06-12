# List by FullForms (Raycast extension)

Search and add entries across your FullForms List glossaries from Raycast.

## Setup

1. Sign in to https://list.fullforms.com.
2. Open Account, scroll to **API tokens**, click **Generate token**, and copy the value. It appears only once, so copy before closing.
3. In Raycast, open this extension's preferences and paste the token into **API Token**.

## Commands

### Search Entries

Type to search across lists and entries. Defaults to **All workspaces**, searching every workspace you belong to in one query (scoped to your memberships on the server). Use the dropdown (visible when you belong to more than one workspace) to narrow to a single workspace.

Results group by parent list under section headers; cross-workspace results suffix the workspace name on the header (e.g. `Glossary · Eduport` vs `Glossary · Personal`) so same-named lists across workspaces stay distinguishable. Each row's icon mirrors the list's colour + glyph from the web (book / clipboard / terminal / etc.). Accessory icons on each row signal `⭐ starred` and `📄 has a private note` for entries you've engaged with.

The detail pane is on by default: split layout shows a markdown preview of the selected entry on the right side, with `## term ⭐` (star when starred) + short definition + horizontal-rule + long-form description + horizontal-rule + `### Your note` (each section only when present). The metadata panel beneath shows a clickable Open link to the web URL, Type, List (with colour-tinted icon), and Workspace.

Shortcuts:

- `Enter` opens the entry's list page in your browser with hash routing to the entry detail modal.
- `Cmd+Shift+O` opens the parent list page.
- `Cmd+I` toggles between detail view and compact-only layout (useful for scanning long result sets).
- `Cmd+S` stars (or unstars) the selected entry. The change shows immediately and syncs to the server.
- `Cmd+C` copies the entry term.
- `Cmd+.` copies the definition.

### Quick Add Entry

Create a new entry without leaving Raycast. Pick a list from the dropdown (grouped by workspace, defaults to your most recently edited list), fill in the term and definition, pick a type, optionally add a description and tags, and submit.

Field order mirrors the web's Add Entry form: List → Entry → Type → Definition → Description → Tags. Selecting a type swaps the Entry and Definition placeholders for a concrete example of that type (Abbreviation shows `Example: GPS` / `Example: Global Positioning System`, Term shows `Example: Deep Learning` / `…`, etc.) so the prompt fits whatever shape of entry you're adding.

**Tags** split across two widgets when the selected list already has tags: a filterable **Tags** picker for the list's existing tags (type a prefix to narrow the chip list) and a **New Tags** text field below it for comma-separated brand-new names. Lists with no existing tags collapse to a single **Tags** text field. Names typed into the new-tags field dedupe case-insensitively against the list's set on save rather than duplicating. Both tag inputs clear when you switch lists.

**Duplicate detection** runs as you type: if an entry with the same term (case-insensitive exact match) already exists on the selected list, a soft `⚠` warning appears under the Entry field and a `Cmd+Shift+O · View Existing Entry` action shows up in the panel deep-linking to the duplicate. Same shape on the Definition field for definition-text matches. Partial matches don't warn (`open` won't flag an existing `Open AI`).

Lists where your role doesn't permit writes (viewer / not a member) are hidden from the dropdown. If you don't have edit access to any list, the command shows a CTA to open the web app. On a successful save the form clears the term, definition, description, and tags (list + type stay so you can keep adding) and stamps a **Last Added** banner above the List dropdown showing the new entry's URL. `Cmd+O · Open Last Added Entry` stays in the action panel until your next save, so the link is reachable long after the success toast fades.

### Suggest Entry

For lists you can see but don't directly edit (or when you'd rather have the owner review before publishing): pick a list, type the term and an optional definition, and submit. The suggestion lands in the owner's moderation queue. Lists with suggestions turned off raise a friendly toast so you can switch lists without losing what you typed.

## Notes

- Tokens are per-user. Each token grants the same access the user has on the web app (workspace memberships, list roles). Revoke a token via Account on the web app and any tool using it stops working immediately.
- Per-token rate limit is 60 requests per minute. Hitting it returns a 429; the extension surfaces a toast.
- This extension only uses public, documented endpoints under `/api/v1/*`.
