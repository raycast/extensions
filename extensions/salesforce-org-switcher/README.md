# Salesforce Org Switcher (Raycast Extension)

A fast, keyboard‑first launchpad for your locally authorized Salesforce orgs. Lists orgs from the Salesforce CLI (`sf` or `sfdx`), lets you add labels and tags, and opens orgs directly in your browser (including Dev Console).

## Features
- List authorized orgs (supports `sf` and `sfdx`).
- One‑shot browser open; copies login URL on demand.
- Label and tag orgs locally (persisted via Raycast storage).
- Filter by tags using dropdown or search tokens.
- Quick actions: Open Dev Console, Refresh, Edit metadata.

## Requirements
- Raycast app
- Node.js 18+
- Salesforce CLI: `sf` (recommended) or `sfdx`
  - Install: `brew install sf`
  - Authorize an org: `sf org login web`

## Getting Started (Development)
1. Install deps (Raycast manages runtime tooling): no extra `npm install` required for core usage.
2. Run in develop mode:
   - `npm run dev`
3. In Raycast, open the command: “Salesforce - Open Org List”.

## Commands & Scripts
- `npm run dev`: Start Raycast develop session.
- `npm run build`: Build the extension bundle.
- `npm run lint` / `npm run fix-lint`: Lint and auto‑fix using `@raycast/eslint-config`.
- `npm run publish`: Submit to the Raycast Store.

## Usage Tips
- Label/Tags: Open an item’s actions → “Edit Label/Tags”. Tags are comma‑separated.
- Tag filter: Use the top‑right dropdown or search tokens:
  - Include tags: `tag:prod tag:team-a`
  - Exclude tags: `-tag:deprecated`
  - Default only: `is:default` (exclude default: `-is:default`)
  - Org type: `type:scratch` or `type:non-scratch` (negate with `-type:scratch`)
- Copy login URL: Use “Copy Login URL” in the actions panel.
- Dev Console: Use “Open Dev Console” to jump straight in.

## Project Structure
- `src/salesforce---open-org-list.tsx`: Main command UI.
- `src/lib/sf.ts`: CLI integration (list/open, URL helpers).
- `src/lib/meta.ts`: Local storage for labels and tags.
- `src/components/EditOrgMeta.tsx`: Form for editing metadata.
- `assets/extension-icon.png`: Extension icon.

## Troubleshooting
- “Salesforce CLI not found”: Install with `brew install sf` (or ensure `sfdx` is on PATH).
- “No authorized orgs”: Run `sf org login web` to connect an org.
- Open failures: Re‑authorize the org, or try again after `sf plugins update`.

## Contributing
See `AGENTS.md` for coding style, commit/PR guidelines, and development conventions.
