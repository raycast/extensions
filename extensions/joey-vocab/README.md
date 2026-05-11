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
4. Enter your Joey email and password in extension preferences when prompted

## Features

- Search the Joey dictionary with tokenized contains-matching
- Preview word definition, image, and example sentence before adding
- Add cards to any of your decks with FSRS initial state
- Switch decks via dropdown (persisted across launches)
- Request missing words via webhook

## Pre-commit Hooks

This project uses [husky](https://typicode.github.io/husky/) with:

- **lint-staged** — ESLint + Prettier on staged `.ts`/`.tsx` files
- **ai-review** — Claude CLI review against CLAUDE.md guidelines (skipped if CLI not installed)
