## Anki Extension for Raycast

The Anki Extension for Raycast integrates the popular Anki flashcard application with the Raycast interface, providing a keyboard-friendly way to manage and review your Anki decks.
It attempts to provide an interface and functionality as close to Anki as possible with the help of the exntensible [anki-connect](https://foosoft.net/projects/anki-connect/) and the rich functionality of Raycast.

## Commands

| Title | Description | Supported Actions |
|-------|-------------|-------------------|
| Decks | Lists all Anki decks | Create Deck, Browse Deck, Study Deck, Delete Deck, Add Card To Deck |
| Browse Cards | Browse all cards in Anki | Search, View, View Metadata, Delete, View Files |
| Add | Add a card to a deck in Anki | Create, Clear Form |

### List of the supported Anki features

**Decks**

- [x] List decks
- [x] List nested decks
- [x] Provide deck statistics (new, learn, due, total cards)
- [x] Create new deck
- [x] Delete deck
- [x] Study deck

**Anki Browser**

- [x] List all cards
- [x] Anki [searching syntax](https://docs.ankiweb.net/searching.html)
- [x] Show card metadata (deck, model, reps, lapses, type, last modified date)
- [x] View files in the card (search files by name, filter by field )
- [x] Quick preview of the files (supports images, audio, video)

**Cards**

- [x] Study card
- [x] Image rendering of any images in the card
- [x] Markdown rendering of the card content
- [x] Support multiple models (note types; see supported list below)

**Supported Anki Models**

- [x] Basic
- [x] Basic (content only)
- [x] Basic (and reversed card)
- [x] Basic (optional reversed card)
- [ ] Cloze
- [ ] Image Occlusion *Note: (partially support; image renders but the effects do not)*
- [ ] Basic (type in the answer)
- [ ] Basic (and reversed card, type in the answer)

## Getting Started

1. Install the [Anki](https://apps.ankiweb.net/)
2. Add the [anki-connect add-on](https://ankiweb.net/shared/info/2055492159) (Please follow the installation instructions provided in the URL) (After installing anki-connect you should re-start Anki for it to activate)
2. Turn-on Anki (in order for this extension to work; Anki has to be running in the background)
3. Launch Raycast and explore the Anki Extension commands to start managing your decks and reviewing flashcards.

## FAQ

### What is Anki?

[Anki](https://apps.ankiweb.net/) is an open-source flashcard program that uses spaced repetition to help you learn and retain information more effectively.

### What is Anki Connect?

It is an awesome Anki add-on (source code: [Anki Connect](https://foosoft.net/projects/anki-connect/)) developed by Alex Yatskov, which allows external applications to communicate with Anki via HTTP requests
