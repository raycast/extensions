# WebGlossary Search

Look up web-development terms from [WebGlossary.info](https://webglossary.info/) — the largest web development glossary — without leaving Raycast. Type a term and the extension opens its definition page directly; anything without an exact match falls back to a full-text search of the site.

## How it works

As you type, the extension normalizes your input into the site's slug format (`Google Developer Expert` → `google-developer-expert`) and checks whether an exact definition page exists:

- **Exact match found** — _Open Definition_ is the default action and takes you straight to the term's page. You can also run a full-text search or copy the definition URL.
- **No exact match** — a full-text search becomes the default action, with an _Open Definition Anyway_ option for the guessed page.

## Why an extension and not a Quicklink

WebGlossary term pages live at `/terms/{slug}/`, where the slug is lowercased and hyphenated. Space-encoded paths (`/terms/google%20developer%20expert/`) are unreliable — they resolve for some terms and 404 for others. Raycast Quicklinks can percent-encode an argument but can't convert spaces to hyphens, so a Quicklink can't reliably reach term pages from natural typing. This extension normalizes the slug in code and probes whether the page exists before choosing the default action.
