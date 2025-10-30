# AGENTS.md

This document centralizes shared guidelines for any AI coding agent collaborating on this repository (ChatGPT, Claude, GitHub Copilot, etc.). Every agent should follow these rules to guarantee consistent output, smooth hand-offs, and predictable tooling behavior.

## Code Comments Policy

**All code comments must be written in English.** This keeps the codebase accessible to every contributor regardless of locale.

- ✅ Use concise English for inline explanations, JSDoc blocks, TODO/FIXME notes, and legal clarifications
- ✅ Document business logic, INPI integrations, and French legal specifics in English
- ❌ Do not mix languages inside a single comment block
- ❌ Do not add French comments even when the domain concerns French companies

Example:
```ts
// GOOD: Legal form mapping – "5599" corresponds to "Société anonyme (SA)" in French law
const LEGAL_FORM_SA = "5599";

// BAD: Mapping des codes de forme juridique INPI
const LEGAL_FORM_SA = "5599";
```

## Standard Development Commands

Raycast API documentation is available locally under `raycast-temp/docs/` for quick reference.

### Core Workflow
- `npm run dev` – Start Raycast development mode
- `npm run build` – Produce the Raycast extension bundle
- `npm run lint` – Run ESLint (via `ray lint`)
- `npm run fix-lint` – Lint with auto-fix enabled
- `npm run publish` – Publish to the Raycast Store

### Testing
- `npm run test` – Execute the full Jest suite
- `npm run test:unit` – Unit tests (no network)
- `npm run test:integration` – Integration tests with mocked INPI data
- `npm run test:integration:real` – Integration tests against the live INPI API
- `npm run test:performance` – Performance smoke tests
- `npm run test:full` – Coverage-enabled, verbose run

### Pre-Submission Checklist
Before preparing a release or store submission, run:
```bash
npm run lint
npm run build
npm run test:full
```
Never bypass the Raycast CLI wrappers—these commands mirror the production environment Raycast uses.

### CI/CD Awareness
Whenever tests or npm scripts change, confirm that `.github/workflows/test.yml` still aligns with the new entry points and patterns. Update the workflow if: script names change, folder layouts move, or additional validation steps become mandatory.

### Changelog Conventions
When editing `CHANGELOG.md`:
- Use `{PR_MERGE_DATE}` for the most recent (unreleased) version
- Keep historical entries dated with the real release date (ISO format)
- Follow semantic versioning (MAJOR.MINOR.PATCH)

## Architecture Snapshot

The project is a Raycast extension that queries the INPI (French National Institute of Industrial Property) API. It accepts SIREN/SIRET identifiers and outputs formatted legal text suitable for contracts.

### Key Modules

**`src/index.tsx`**
- `SearchForm` – Handles SIREN/SIRET input, validation, and clipboard bootstrap
- `CompanyDetail` – Fetches company details and renders the markdown output
- `CompanyDetailsView` – Displays markdown plus structured metadata and actions

**`src/lib/inpi-api.ts`**
- `login` – Obtains Bearer tokens (with caching)
- `getCompanyInfo` – Fetches company data by SIREN, handles 404 and retries

**`src/lib/utils.ts`**
- `validateAndExtractSiren` – Normalizes SIREN/SIRET
- `formatAddress` – Produces standardized French addresses
- `formatSiren` / `formatFrenchNumber` – Apply French typographic conventions
- `getLegalFormLabel`, `getRoleName`, `getGenderAgreement` – Domain-specific helpers

**`src/lib/markdown-builder.ts`**
- Builds markdown for corporate (`personneMorale`) and individual (`personnePhysique`) entities
- Supports customizable templates via Raycast preferences
- Supplies HTML/plain-text conversions for clipboard actions

**`src/lib/recursive-representative-search.ts`**
- Finds the physical representative when the first-level representative is a holding company
- Prevents infinite loops via depth limits and validation

**`src/types.ts`**
- Declares `CompanyData`, `RepresentativeInfo`, `Preferences`, and address/person helpers

### INPI API Essentials
- Authentication: `POST /api/sso/login` with username/password → Bearer token
- Company lookup: `GET /api/companies/{siren}`
- Rate limiting: 30 requests/minute; exponential backoff implemented

Important data fields:
- `formality.siren` – 9-digit identifier
- `personneMorale.denomination` – Company name
- `personneMorale.capital.montant` – Share capital
- `immatriculationRcs.villeImmatriculation` – Registry city
- `composition.pouvoirs[]` – Representatives (individual or holding)

### Output Format Expectations

**Personne morale (company)**
```
La société [DENOMINATION]
[FORME JURIDIQUE] au capital de [CAPITAL] €
Immatriculée au RCS de [VILLE] sous le n° [SIREN]
Dont le siège social est situé [ADRESSE]
Représentée aux fins des présentes par [REPRESENTANT] en sa qualité de [RÔLE], dûment [HABILITÉ/HABILITÉE].
```

**Holding chain**
```
Représentée aux fins des présentes par la société [HOLDING] en tant que [RÔLE HOLDING], elle-même représentée par [PHYSICAL REP] en tant que [RÔLE PHYSICAL REP], dûment [HABILITÉ/HABILITÉE].
```

**Personne physique (individual entrepreneur)**
```
[Monsieur/Madame] [PRENOM] [NOM]
[Né/Née](e) le [DATE] à [LIEU]
De nationalité [NATIONALITÉ]
Demeurant [ADRESSE]
N° : [SIREN]
```

Formatting standards:
- Non-breaking spaces for thousands (9 077 707 050,00 €)
- Non-breaking spaces inside SIREN (784 608 416)
- Two decimal places with comma separator

## Collaboration Tips for Agents

1. **Respect existing tooling** – Reuse helpers from `src/lib/utils.ts` and `markdown-builder.ts` before reinventing logic.
2. **Run targeted tests** – Scope Jest commands to the files touched when possible (e.g., `npm test -- markdown-builder`).
3. **Mind recursion safeguards** – Any change to representative lookups must keep the depth guard intact.
4. **Document in English** – Update README/CLAUDE/AGENTS files when introducing new workflows or placeholders.
5. **Communicate assumptions** – If data is missing or mocked, state the limitation in PR descriptions or commit messages.

Following these guidelines keeps hand-offs between agents reliable and aligns the repository with Raycast’s publishing requirements.
