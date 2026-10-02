<img src="assets/extension-icon.png" width="96" alt="Inoh logo" />

# Inoh

**Superpower your English.** Collect words anywhere. Turn them into rich
vocabulary cards and make them yours.

[Inoh](https://inoh.app) is a vocabulary app with a 45,000 word dictionary,
spaced repetition, pronunciation scoring and quizzes. This extension puts the
collecting half on your Mac: look a word up from wherever you are reading, add
it to a deck, and when the dictionary doesn't have the word, make the card
yourself without leaving Raycast.

## Commands

| Command                         | Description                                            |
| ------------------------------- | ------------------------------------------------------ |
| **Search Word**                 | Search the Inoh dictionary and add cards to your deck  |
| **Generate**                    | Turn words the dictionary doesn't have into your cards |
| **Search Selected Word**        | Look up selected text in the Inoh dictionary           |
| **Search Word from Screenshot** | Read a word off the screen with OCR and look it up     |

## Features

- Search 45,000+ dictionary words with tokenized contains-matching — **free, no account required**
- Preview the definition, image and example sentence before adding, and hear the word said out loud
- Add to any of your decks, ready for review with a full FSRS learning state (requires an Inoh account)
- Look up the word you have selected in any app, or grab one off the screen with OCR when the text can't be selected
- Make the card yourself when the dictionary doesn't have the word: your own private card in about a minute, or a request for the public dictionary
- Save a word for later instead, and finish it on the web, on your phone, or from an AI assistant

Open the actions panel and choose **Apps → [Connect to Claude](https://docs.inoh.app/#claude)** to set up practice with your Inoh deck. **AI Assistants** stays in the same section for all connection guides.

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

## Generate

For words the Inoh dictionary doesn't have yet. Pick a dictionary, type the
word, say which meaning its card should teach, and Inoh makes the card:

- **Private** cards are yours only and take about a minute
- **Public** requests go to a reviewer and land in the shared dictionary if
  approved, which can take days

The meaning is asked for rather than guessed, because a word alone isn't enough
to generate from — "spring" has several senses and a card teaches one.

Private cards come out of a monthly allowance — 50 on Free, 300 on Plus, 1,000
on Pro, reset on the 1st — and the form warns you once it's nearly spent. Run
out and the refusal says so in your plan's own words and offers the upgrade.
Public requests never touch the allowance.

If the word was already saved to your drafts from a search miss, this fills
that draft in rather than writing a second one. A request that's refused — you
already have one in flight for that word, or you've used the month's private
cards — leaves the word waiting in your drafts, so nothing you typed is lost.

## Plans

|                             | Free        | Plus          | Pro            |
| --------------------------- | ----------- | ------------- | -------------- |
| Cards in your decks         | 300         | 1,000         | Unlimited      |
| Cards you generate yourself | 50 a month  | 300 a month   | 1,000 a month  |
| Pronunciation practice      | 100 a month | 1,000 a month | 10,000 a month |

Searching the dictionary is free and needs no account at all. Everything in
the table needs one.

Your plan shows as a badge in the header next to your email. Free and Plus
accounts get an **Upgrade Plan** action that opens the plans page in your
browser; paid accounts get **Manage Subscription**, which opens your account
settings on [app.inoh.app](https://app.inoh.app) to change or cancel. After
you upgrade, the badge updates the next time you open the extension.

## Development Checks

Install dependencies with `npm ci`. Run `npm test` for definition-field and sign-in
regression tests, `npm run lint` for linting and formatting, `npm run typecheck`
for strict type checking of the extension and tests, and `npm run build` to
compile the extension. The tests use React Test Renderer with controlled
suggestion responses, deck loading, sign-in callbacks, and timers.

The existing backend tests run with `npm run e2e:run` against a local Inoh
Supabase stack. Set `INOH_BACKEND_DIR` to the backend checkout when it is not
at `../inoh-backend`.
