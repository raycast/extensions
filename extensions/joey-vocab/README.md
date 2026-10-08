# Joey Vocabulary — Raycast Extension

Add vocabulary cards to your [Joey](https://github.com/your-org/joey) decks directly from Raycast.

## Commands

| Command                  | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| **Search Word**          | Search the Joey dictionary and add cards to your deck |
| **Search Selected Word** | Look up selected text in the Joey dictionary          |

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start development:

```bash
npm run dev
```

3. Open Raycast and search for "Search Word" or "Search Selected Word"
4. Searching is free and needs no account. To **add** cards to a deck, sign in
   when prompted: enter your Joey email, then the one-time code sent to your
   inbox — no password needed. The same step signs you in or creates your
   account automatically.

### Supabase environment

The extension picks its Supabase project automatically:

- **Development** (`npm run dev`) → local Docker Supabase (`http://127.0.0.1:54321`)
- **Installed / published** → production Supabase

This uses Raycast's `environment.isDevelopment`, so there is nothing to
configure. Start the local stack with `pnpm start` in `joey-backend/supabase`
before running `npm run dev`, and make sure your test account exists in the
local auth database.

## Features

- Search the Joey dictionary with tokenized contains-matching — **free, no account required**
- Preview word definition, image, and example sentence before adding
- Add cards to any of your decks with FSRS initial state (requires a Joey account)
- Switch decks via dropdown (persisted across launches)
- Request missing words with a word + context form (saved to your Joey account)

## Plans

Adding cards requires a Joey account. The **free plan** holds up to **300 cards**
across all decks. When you reach the limit, the extension opens **Joey Pro**
checkout in your browser for unlimited cards. The 300-card limit is enforced
server-side, so it applies consistently across the Raycast extension and the
Joey app.

## Pre-commit Hooks

This project uses [husky](https://typicode.github.io/husky/) with:

- **lint-staged** — ESLint + Prettier on staged `.ts`/`.tsx` files
- **ai-review** — Claude CLI review against CLAUDE.md guidelines (skipped if CLI not installed)
