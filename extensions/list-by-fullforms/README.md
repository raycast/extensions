# List by FullForms

Search and add abbreviations, full forms, and glossary terms from Raycast.

List by FullForms brings your [FullForms](https://fullforms.com) List glossaries into Raycast. Look up an abbreviation and its full form, search every term across your workspaces, and add or suggest new entries without opening a browser. It is built for teams who keep shared glossaries of acronyms, jargon, and domain terms, and for anyone who wants their personal reference list a keystroke away.

## Features

- Search abbreviations, full forms, and glossary terms across every workspace you belong to, in a single query.
- A detail pane with the full definition, the long-form description, and your private notes.
- Quick Add entries with type-aware prompts, a tag picker, and live duplicate detection.
- Suggest a term to a list owner's moderation queue when you only have view access.
- Star entries, copy a term or definition, and hear entries read aloud with macOS text-to-speech.

## Setup

1. Sign in to https://list.fullforms.com.
2. Open Account, scroll to **API tokens**, click **Generate token**, and copy the value. It appears only once, so copy before closing.
3. In Raycast, open this extension's preferences and paste the token into **API Token**.

## Commands

### Search Entries

Type to search across your lists and entries. By default it searches every workspace you belong to in a single query; use the dropdown (shown when you belong to more than one workspace) to narrow to a single workspace.

Results group by their parent list under section headers. When the same list name exists in more than one workspace, the workspace name is added to the header (e.g. `Glossary · FullForms` vs `Glossary · Personal`) so they stay distinct. Each row carries the list's colour and icon from the web, plus accessory markers for `⭐ starred` entries and `📄 entries with a private note`.

The detail pane is on by default and shows a formatted preview of the selected entry: the term, the short definition, the long-form description, and your private note, with each section shown only when present. A metadata panel below links to the entry on the web and shows its type, list, and workspace.

Shortcuts (on Windows, `Cmd` is `Ctrl` and `Opt` is `Alt`):

- `Enter` opens the entry's list page in your browser with hash routing to the entry detail modal.
- `Cmd+Shift+O` opens the parent list page.
- `Cmd+I` toggles between detail view and compact-only layout (useful for scanning long result sets).
- `Cmd+S` stars (or unstars) the selected entry. The change shows immediately and syncs to the server.
- `Cmd+C` copies the entry term.
- `Cmd+.` copies the definition.

Text-to-speech (Speak Entry / Speak Definition) is macOS-only; it uses the built-in `say` binary and the actions do not appear on Windows.

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
