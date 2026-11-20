## Anki Extension for Raycast

The Anki Extension for Raycast integrates the popular Anki flashcard application with the Raycast interface, providing a keyboard-friendly way to manage and review your Anki decks.
It attempts to provide an interface and functionality as close to Anki as possible with the help of the exntensible [anki-connect](https://foosoft.net/projects/anki-connect/) and the rich functionality of Raycast.

## Commands

| Title | Description | Supported Actions |
|-------|-------------|-------------------|
| Decks | Lists all Anki decks | Create Deck, Browse Deck, Study Deck, Delete Deck, Add Card To Deck |
| Browse Cards | Browse all cards in Anki | Search, View, Edit Note, View Metadata, Delete Note, View Files |
| Add Card | Create notes using your Anki note types | Create, Attach Files, Clear Form |
| View Stats | View Anki collection statistics | View |

### Create notes with custom note types

1. Create or customize a note type in Anki using **Tools → Manage Note Types**.
2. Open **Add Card** in Raycast, or **Add Card To Deck** from the Decks command.
3. Select a **Note Type**. The form displays its fields in the order configured in Anki.
4. Enter text or attach media to the first field. Other fields can remain empty, including optional hints and extra information.
5. Submit the form. Anki creates the cards defined by that note type's templates.

Custom field names and HTML content are preserved. For Cloze notes, enter Anki syntax such as `{{c1::answer}}` in the appropriate field. Anki validates the note and its templates when saving. The **Allow Empty First Field** preference in the Add Card command skips the local first-field check; Anki may still reject an empty note.

Changing the note type clears field contents and attachments. Clearing the form or adding a note keeps the selected deck, note type, and tags for the next note. Reopen the command after changing note types or fields in Anki to reload them.

This command uses note types already present in Anki. Create templates and image occlusion masks in Anki. The study view has separate rendering limitations, listed below.

### Edit notes and tags

Select a card in **Browse Cards** and choose **Edit Note** or press **⌘E**. Editing changes the note shared by every card generated from it. The editor shows custom fields in their configured order and saves only changed fields and tags.

Fields contain Anki HTML. Keep existing image and sound markup to preserve attachments. Select existing tags or enter new ones in **New Tags**, separated by spaces. Use `parent::child` for nested tags. New-tag entry is also available in Add Card.

If an update fails, Anki may already have saved some changes. The editor keeps your draft and explains that you should inspect the note before retrying.

### Raycast AI

Mention `@Anki` in Raycast AI to work with your local collection. Anki must be running with AnkiConnect enabled.

- List decks and card counts.
- Discover note types and their exact field names, including custom types.
- Search notes with Anki syntax and retrieve more results in bounded pages.
- Create decks and notes, or update specific note fields and tags.

For example, ask “Create a Basic note in Languages with Front bonjour, Back hello, and tag french.” Mutation tools show the proposed changes for confirmation. They respect the extension's duplicate-note preferences. Uncertain writes are reported without automatic retries.

The tools use note IDs, since a note can generate several cards. Updating tags replaces the tag list; the AI reads existing tags before adding a tag. The tools support HTML and cloze syntax. Create note types, templates, image occlusion masks, and media attachments in Anki or the Add Card command. Review grades remain under your control in the study commands.

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

**Study view rendering support**

The study view converts Anki's rendered questions and answers to Markdown. Reversed cards use the correct direction, and cloze answers remain hidden until revealed. Future learning cards wait until their scheduled time.

Typed-answer and image occlusion cards show a **Study in Anki** action because they require Anki's native reviewer. Use that action for custom CSS or JavaScript templates, media playback, and Anki's scheduler ordering and daily limits. Raycast's Markdown view does not reproduce those features.

- [x] Basic
- [x] Basic (content only)
- [x] Basic (and reversed card)
- [x] Basic (optional reversed card)
- [x] Cloze
- [ ] Image Occlusion. Use Study in Anki.
- [ ] Basic (type in the answer). Use Study in Anki.
- [ ] Basic (and reversed card, type in the answer). Use Study in Anki.

### Deleting notes

**Delete Note** removes the selected card's note and every associated card, including cards in other decks. The confirmation explains this before deletion.

### Verification

Use Node.js 22.22.2 or later. Run `npm ci`, `npm run build`, `npm test`, `npm run typecheck`, and `npm run lint`. Build first to generate the Raycast definitions used by the type-contract test. The extension CI workflow runs the Ray CLI on pushes and pull requests, but does not invoke this extension's `test` or `typecheck` scripts. Run those checks locally before contributing. Regression tests cover note payloads, editing, pagination, error messages, API retries, grading, study rendering, and AI tool results and confirmations.

Run `npx ray evals -I --exit-on-error` to check the AI instructions with mocked tool responses. These evals do not validate the connection to Anki.

With Anki running, `npm run test:live` exercises all seven tool implementations against AnkiConnect. It creates a uniquely named verification deck, custom note type, and note and leaves them available for inspection. It does not change existing notes. Set `ANKI_PORT` if AnkiConnect uses a port other than 8765. See [AUDIT.md](AUDIT.md) for verification evidence and known limitations.

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
