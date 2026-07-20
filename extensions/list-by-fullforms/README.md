# List by FullForms

Search and add abbreviations, full forms, and glossary terms from Raycast.

List by FullForms brings your [FullForms](https://fullforms.com) List glossaries into Raycast. Look up an abbreviation and its full form, search every term across your workspaces, and add, edit, or suggest entries without opening a browser. It is built for teams who keep shared glossaries of acronyms, jargon, and domain terms, and for anyone who wants their personal reference list a keystroke away.

## Features

- Search abbreviations, full forms, and glossary terms across every workspace you belong to, in a single query.
- A detail pane with the full definition, the long-form description, and your private notes.
- Edit an entry straight from a search result when you have edit access to its list, and add one on the spot when a search comes up empty.
- Attach a private note to any entry you can read; only you see it, in Raycast and on the web.
- Report an entry to its list owner's moderation queue with a reason and an optional note.
- Quick Add entries with type-aware prompts, a single tags field, and live duplicate detection.
- Generate a definition or description with Raycast AI (shown when your account has AI access).
- Suggest a term to a list owner's moderation queue when you only have view access.
- Star entries, copy a term or definition, and hear entries read aloud with macOS text-to-speech.

## Setup

1. Sign in to https://list.fullforms.com.
2. Open Account, scroll to **API tokens**, click **Generate token**, and copy the value. It appears only once, so copy before closing.
3. In Raycast, open this extension's preferences and paste the token into **API Token**.

## Commands

### Search Entries

Type to search across your lists and entries. By default it searches every workspace you belong to in a single query; use the dropdown (shown when you belong to more than one workspace) to narrow to a single workspace.

Results group by their parent list under section headers. When the same list name exists in more than one workspace, the workspace name is added to the header (`Glossary · FullForms` vs `Glossary · Personal`) so they stay distinct. Each row carries the list's colour and icon from the web, plus accessory markers for `⭐ starred` entries and `📄 entries with a private note`.

The detail pane is on by default and shows a formatted preview of the selected entry: the term, the short definition, the long-form description, and your private note, with each section shown only when present. A metadata panel below links to the entry on the web and shows its type, list, visibility, workspace, and tags.

Shortcuts (on Windows, `Cmd` is `Ctrl` and `Opt` is `Alt`):

- `Enter` opens the entry's list page in your browser with hash routing to the entry detail modal.
- `Cmd+Shift+O` opens the parent list page.
- `Cmd+I` toggles between detail view and compact-only layout (useful for scanning long result sets).
- `Cmd+S` stars (or unstars) the selected entry. The change shows immediately and syncs to the server.
- `Cmd+E` opens an edit form for the selected entry, shown only when you have edit access to its list; change the term, type, definition, description, and tags, then save back.
- `Cmd+Shift+N` opens a private-note editor for the entry so you can add, edit, or clear a note only you can see.
- `Cmd+Shift+R` reports the entry to its list owner's moderation queue: pick a reason (typo, factual error, inappropriate, duplicate, other) and optionally add a note. Reporting has to be enabled on the list by its owner; if it isn't, you'll get a message saying so.
- `Cmd+C` copies the entry term.
- `Cmd+.` copies the definition.

When a search returns no matches, an **Add Entry** action appears, pre-filled with your search term, so you can create the missing entry without leaving Search; it opens the same Quick Add form described below.

Text-to-speech (Speak Entry / Speak Definition) is macOS-only; it uses the built-in `say` binary and the actions do not appear on Windows.

### Quick Add Entry

Create a new entry without leaving Raycast. Pick a list from the dropdown (grouped by workspace, defaults to your most recently edited list), fill in the term and definition, pick a type, optionally add a description and tags, and submit.

Field order is List → Type → Entry → Definition → Description → Tags (Type sits above Entry). Type comes first so that selecting it swaps the Entry and Definition placeholders for a concrete example of that type before you start typing (Abbreviation shows `Example: GPS` / `Example: Global Positioning System`, Term shows `Example: Deep Learning` / `…`, etc.) so the prompt fits whatever shape of entry you're adding.

**Tags** is a single comma-separated field covering both existing and new tags. Type tag names separated by commas; on save each name is matched case-insensitively against the list's existing tags (reusing that tag) or created as a new one, so you never make an accidental duplicate. When the list already has tags, they are listed in the field's info tooltip (the ⓘ) so you can see what to reuse. The field clears when you switch lists. (Raycast's tag picker can only select from predefined items and can't create new ones by typing, so a single text field with server-side name resolution is the closest single-field port of the web's tag input.)

**Duplicate detection** runs as you type: if an entry with the same term (case-insensitive exact match) already exists on the selected list, a soft `⚠` warning appears under the Entry field and a `Cmd+Shift+O · View Existing Entry` action shows up in the panel deep-linking to the duplicate. Same shape on the Definition field for definition-text matches. Partial matches don't warn (`open` won't flag an existing `Open AI`).

**AI helpers** (Raycast AI, requires a Raycast account with AI access): the action panel offers **Generate Definition** (`Cmd+G`), which writes a concise definition from the term, and **Generate Description** (`Cmd+Shift+G`), which writes a longer description from the term and definition. The result drops straight into the field, where you can edit it before saving. These actions only appear when your account has AI access. To dictate instead of typing, use Raycast's built-in dictation in any text field; it needs no setup here.

Lists where your role doesn't permit writes (viewer / not a member) are hidden from the dropdown. If you don't have edit access to any list, the command shows a CTA to open the web app. On a successful save the form clears the term, definition, description, and tags (list + type stay so you can keep adding) and stamps a **Last Added** banner above the List dropdown showing the new entry's URL. `Cmd+O · Open Last Added Entry` stays in the action panel until your next save, so the link is reachable long after the success toast fades.

### Suggest Entry

For lists you can see but don't directly edit (or when you'd rather have the owner review before publishing): pick a list, type the term and an optional definition, and submit. The suggestion lands in the owner's moderation queue. Lists with suggestions turned off raise a friendly toast so you can switch lists without losing what you typed.

## Notes

- Tokens are per-user. Each token grants the same access the user has on the web app (workspace memberships, list roles). Revoke a token via Account on the web app and any tool using it stops working immediately.
- Per-token rate limit is 60 requests per minute. Hitting it returns a 429; the extension surfaces a toast.
- This extension only uses public, documented endpoints under `/api/v1/*`.
