<img src="assets/extension-icon.png" width="96" alt="Inoh logo" />

# Inoh

[Inoh](https://inoh.app) is the vocabulary app for the articulate. This extension adds words to your Inoh decks directly from Raycast.

## Commands

| Command                         | Description                                           |
| ------------------------------- | ----------------------------------------------------- |
| **Search Word**                 | Search the Inoh dictionary and add cards to your deck |
| **Search Selected Word**        | Look up selected text in the Inoh dictionary          |
| **Search Word from Screenshot** | Read a word off the screen with OCR and look it up    |

## Features

- Search the Inoh dictionary with tokenized contains-matching — **free, no account required**
- Grab a word off the screen with OCR when the text can't be selected
- Preview word definition, image, and example sentence before adding
- Add cards to any of your decks with FSRS initial state (requires an Inoh account)
- Switch decks via dropdown (persisted across launches)
- Pronounce words with audio playback
- Request missing words with a word + context form (saved to your Inoh account)

## Getting Started

Searching is free and needs no account. To **add** cards to a deck, sign in
when prompted: enter your Inoh email, then the one-time code sent to your
inbox — no password needed. The same step signs you in or creates your
account automatically.

## Search Word from Screenshot

![Capturing the word shriek from a video caption and adding it to a deck](./media/search-word-from-screenshot.gif)

For words you can't select: video captions, PDFs, ebooks, video calls, games.
The command draws a crosshair, you drag a box around the word, and the search
list opens with it already looked up. Recognition runs on-device through Apple
Vision, so no image ever leaves your Mac.

Draw the box around a **single word**. Inoh matches against the word itself, so
capturing a whole sentence finds nothing.

macOS needs **Screen Recording** permission for Raycast the first time you run
it. One caveat worth knowing: macOS blanks DRM-protected video before anything
can capture it, so subtitles in Netflix and Apple TV+ come through as a black
rectangle. The command tells you when that happens. YouTube, local video files,
and everything else work normally.

## Plans

The free plan includes **up to 300 cards** — you only need an Inoh account.
Paid plans hold more cards and unlock more practice in the Inoh app:

- **Inoh Plus** — up to 1,000 cards, unlimited daily reviews + 1,000 pronunciation practices/month
- **Inoh Pro** — everything in Plus, unlimited cards + 10,000 pronunciation practices/month

Your current plan shows as a badge in the header next to your email
(Free, Plus, or Pro). Free accounts get an **Upgrade Plan** action that opens
the Inoh plans page in your browser; paid accounts get **Manage Subscription**,
which opens your account settings on [inoh.app](https://inoh.app) to change or
cancel the plan. After you upgrade, the badge updates the next time you open
the extension.

## End-to-end tests

Raycast is closed-source and offers no way to drive an extension's views, so
these tests exercise the extension's **real modules** — its Supabase client,
auth, dictionary search, and FSRS card seeding — against a **local** Supabase
stack. Nothing is mocked except `@raycast/api` itself, which only exists inside
the Raycast runtime.

```bash
cd ../inoh-backend && pnpm db:start     # once per session
cd -                                     # back here
pnpm e2e:run
```

Covered: signing in with a real emailed code, the free-plan reading, dictionary
search (hit and miss), adding a word with correct FSRS seeding, removing it,
refusing a duplicate, and the free card cap's message.

The views themselves are on the manual checklist in
[inoh-backend/E2E.md](../inoh-backend/E2E.md).
