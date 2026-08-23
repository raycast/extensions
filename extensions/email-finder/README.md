# Mail Finder

Find verified professional email addresses from Raycast. Search by name and company, browse employees at a domain, and revisit past lookups—all powered by [Mail-Finder.org](https://mail-finder.org/).

**Platforms:** macOS, Windows

## Features

- **Email lookup** — First name, last name, and company domain with verification status
- **Rich profiles** — Job history, LinkedIn, location, and company metadata (size, funding, revenue, description)
- **Company discovery** — Autocomplete company names to domains (no need to guess `acme.com`)
- **Employee directory** — List people at a domain, filter by department, load more pages
- **Search history** — Rerun past email and company searches, view cached results, clear history
- **Credits** — Remaining API balance shown in forms

## Setup

1. Sign up and create an API key at [Mail-Finder.org](https://mail-finder.org/) (keys start with `mf_`).
2. Install the extension from the [Raycast Store](https://www.raycast.com/morrissimons/mail-finder) or run it locally with `npm run dev`.
3. Open **Raycast → Extensions → Mail Finder → Configure Extension** and paste your API key.
4. Run any Mail Finder command. If the key is missing, the extension prompts you to open preferences.

API usage consumes credits on your Mail-Finder.org account. Each successful enrich/search deducts according to your plan.

## Commands

### Find Email

Look up one person’s verified email.

1. Run **Find Email** (or pass arguments: first name, last name, domain).
2. If you did not pass a domain, search for a company by name or enter a domain manually.
3. Submit first name, last name, and domain.
4. Review the result: email (with verified status), experience, company sidebar, and actions to **Copy Email** or **Copy LinkedIn URL**.

**Tip:** Pre-fill fields from other workflows using Raycast command arguments (`firstName`, `lastName`, `domain`).

### Browse Employees

Discover people at a company before enriching an individual.

1. Run **Browse Employees** (optional argument: `domain`).
2. Pick a company via autocomplete or enter a domain.
3. Browse employees grouped by department; use the search bar and department dropdown to narrow the list.
4. **Load More Employees** when additional pages are available.
5. Select someone to run a full email enrich (same detail view as **Find Email**).

Company searches are saved to history with cached employee lists for quick return visits.

### Search History

Manage prior lookups.

- **Email searches** — Rerun **Find Email**, open cached results, copy emails, or remove entries.
- **Company searches** — Reopen employee lists, copy domains, or delete entries.
- **Filters** — All, email only, company only, success, or error.
- **Clear** — Remove individual items or wipe email/company history in bulk.

## Keyboard shortcuts

| Action                          | Shortcut |
| ------------------------------- | -------- |
| Copy LinkedIn URL (result view) | `⌘` `L`  |
| Close result / go back          | `⌘` `B`  |

## Development

```bash
npm install
npm run dev      # Run in Raycast with hot reload
npm run lint     # ESLint
npm run build    # Production build
```

Set your API key in extension preferences before testing API calls.

## Third-party services

### Mail-Finder.org (required)

- **Base URL:** `https://api.mail-finder.org`
- **Auth:** API key in extension preferences (`X-API-Key`)
- **Used for:** Person enrich, employee search, credits balance
- **Data sent:** Names, domains, and search parameters you enter; your API key on authenticated requests

### Clearout (company autocomplete)

In addition to the Mail-Finder.org API, this extension makes unauthenticated calls to **Clearout** for company-name autocomplete:

- **Endpoint:** `https://api.clearout.io/public/companies/autocomplete`
- **Used by:** `searchCompanyByName` in `src/api/clearout-client.ts`
- **Purpose:** Resolve a typed company name to a domain (and logo) so users can search without knowing the exact domain.
- **Auth / cost:** Public endpoint; no API key or credits required.
- **Data sent:** The query string typed into the company field. No personal data or Mail-Finder API keys are transmitted.

## License

MIT
