# Changelog

## [Generate Command] - 2026-09-23

- Adding a card after signing in waits for the account's decks and uses its
  first deck, without needing a second press. An empty deck list or failed
  load is reported without attempting to add the card
- Canceling Generate's sign-in no longer leaves a pending submission for a
  later Account sign-in, even if the form has been edited

- Added **Connect to Claude** to the Apps actions, with a Claude icon and a
  direct setup guide. **AI Assistants** remains available for other connections
- Changing or clearing the word immediately invalidates pending definition
  suggestions, including while the next word is still waiting to be requested

- New **Generate** command: pick a dictionary, type a word the dictionary
  doesn't have, say which meaning its card should teach, and Inoh makes the
  card without leaving Raycast — a private card of your own, or a request for
  the public dictionary
- The action panel now always offers **Sign In** when you are signed out, from
  every command and every view, rather than only from the ones that happened to
  need an account
- Signed out, the panel no longer offers the pages an account is needed for:
  the deck and the drafts composer both answer a visitor with a sign-in screen,
  while the dictionary is browsable and stays
- Signed out, an action that says it signs you in now does exactly that, and
  then carries on with what you asked for: signing in from a search miss opens
  Generate on that word, saves the word, or adds the card you were looking at
- Generate says an account is needed before you type rather than after you
  press it, and signing in from there keeps what you typed and makes the card,
  instead of handing the form back for a second press
- A search that finds nothing now offers **Generate a Card** first, which opens
  the command with the word already filled in and the cursor on the meaning.
  Save to Drafts is still there, one key along
- A word already saved to your drafts from a search miss is filled in rather
  than written down twice, so the two halves of the flow meet
- The form says when the month's private cards are nearly gone — "Only 3 cards
  left this month." — in the same words the web app and the AI connector use
- Running out says so in your plan's own words and offers **Upgrade Plan**,
  unless you are on Pro, which has nothing above it. The word stays in your
  drafts either way
- A card that has gone says so and names the page it is watched from, showing
  the dictionary it actually went to
- The definition writes its own first draft: type the word, pause, and Inoh
  fills in what it thinks the word means, tagged **Suggested**, for you to
  correct. You came looking for the word because you do not know it well, so
  answering "which sense should this card teach" from nothing is the hardest
  part of a search miss. Anything you have typed yourself is left alone
- A card Inoh looks to have already holds the word back once and says where it
  found it, and the button becomes **Generate Anyway** or **Request Anyway** so
  the second press goes through. Editing the word or the meaning asks again

## [Drafts Link and AI Assistants] - 2026-09-23

- The action panel now opens with ⌘K before a word is typed: **Open
  Dictionary** and **Open Deck** lead it, with the account and the other Inoh
  apps under them, none of which used to be reachable from an empty search
- After a word is saved to drafts, the list says so and shows the web app link
  that finishes the card, which used to live only in a toast that fades
- The account row now opens Settings in the Inoh web app instead of copying
  your email address to the clipboard
- The Apps section now links **AI Assistants**: how to connect Claude, ChatGPT,
  Cursor, and the rest to Inoh over MCP

## [Drafts for Missing Words] - 2026-09-23

- A word the dictionary doesn't have can now be saved to your Inoh drafts from
  the empty search results, instead of being requested through a form
- The card itself is made in the Inoh web app, which is where you say what the
  word means and choose between your own private card and a request for the
  public dictionary

## [Search Word from Screenshot] - 2026-09-04

- New **Search Word from Screenshot** command: drag a box around a word
  anywhere on screen and the search list opens with it looked up, for text that
  can't be selected such as video captions, PDFs, and ebooks
- Recognition runs on-device through Apple Vision, so no image leaves the Mac
- Says so when a capture comes back blank, which is what DRM-protected video
  and a missing Screen Recording permission both look like

## [iOS App Link] - 2026-08-22

- The Apps section now opens the Inoh iOS app on the App Store instead of
  showing a "coming soon" toast

## [Plan State in the Header] - 2026-08-22

- The plan badge now shows what is about to change: "Plus · ends 1 Sep" for a
  pending cancellation, "Pro · Plus from 1 Sep" for a scheduled downgrade, and
  "payment failed" when the card needs fixing
- The account action matches: Resume Subscription, Fix Payment, or Manage
  Subscription open the web app's new Plan & Billing page

## [New Tagline] - 2026-08-22

- Store description now leads with the Inoh tagline: the vocabulary app for the articulate

## [Per-Plan Card Limits] - 2026-08-22

- Total cards are now capped per plan: Free holds up to 300 cards, Plus up to
  1,000, and Pro is unlimited
- Hitting your plan's limit shows an "Upgrade Plan" action right on the toast
- Pronunciation practice quotas are now monthly pools (Plus 1,000/month, Pro 10,000/month)

## [Free/Plus/Pro Plans] - 2026-08-17

- Plans are now Free, Plus, and Pro. Total cards are capped per plan: Free
  holds up to 300 cards, Plus up to 1,000, and Pro is unlimited
- Your plan (Free, Plus, or Pro) shows as a badge in the header next to
  your email
- New "Upgrade Plan" action in the actions menu that opens the Inoh plans
  page (Inoh Plus and Inoh Pro) in your browser; paid plans get a
  "Manage Subscription" action that opens your account settings on inoh.app
- Hitting your plan's limit shows an "Upgrade Plan" action right on the toast
- Pronunciation practice quotas are now monthly pools (Plus 1,000/month, Pro 10,000/month)

## [Apps Section] - 2026-08-10

- New "Apps" section in the actions menu linking to the other Inoh apps
  (web app, Chrome extension, and Obsidian plugin, with the iOS app
  marked coming soon)

## [New Logo] - 2026-08-10

- Fresh new Inoh logo across the extension and store listing

## [Renamed to Inoh] - 2026-08-10

- Joey is now **Inoh** — same extension, new name
- Because the extension identity changed, you will be asked to sign in again
  with your email one-time code; your decks and cards are untouched
- Hotkeys, aliases, and quicklinks pointing at the old extension need to be
  re-assigned
- Removed the post-sign-up welcome screen — after signing in you land straight
  in search

## [Free Search & Passwordless Sign-In] - 2026-06-01

- Search the dictionary for free — no account required
- Sign in with a one-time code sent to your email, no password needed
- A single email field signs you in or creates your account automatically
- See which account you're signed in as, and sign out, from the actions menu
- Add up to 300 cards on the free plan, with an upgrade to Inoh Pro for more

## [Initial Release] - 2026-04-21

- Search vocabulary words with definitions, images, and example sentences
- Pronounce words with audio playback
- Add cards to your Inoh decks
- Search selected text from any app
- Request missing words to be added
