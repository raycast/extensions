# Super Anki

Super Anki is a Raycast extension designed to seamlessly connect users, especially students, to their self-hosted Anki server. With Super Anki, users can easily create and manage your Anki decks and notes directly from Raycast.

## Features

- **Get Deck Names**: Retrieve the names of all decks in your Anki collection.
- **Add New Deck Names**: Create new decks, including nested decks (e.g., `Deck1::subdeck1`).
- **Get Notes from a Specific Deck**: Fetch notes from a specific deck.
- **Add Notes to a Specific Deck**: Add notes to any deck.
- **Markdown Support**: Write and manage notes with Markdown formatting.
- **Global Deck Name Storage**: Save the last used deck name globally within the extension for quick access.
- **Sync Anki Database**: Sync your Anki database to ensure all changes are up-to-date.

## Requirements

- Anki application installed on your computer.
- Anki Connect extension installed in Anki to enable API routing. [Download Anki Connect](https://git.foosoft.net/alex/anki-connect)
- (Optional) Docker for self-hosting Anki to reacht your anki GUI everywhere in the. [Docker Installation Instructions](https://github.com/mlcivilengineer/anki-desktop-docker)

## Installation

1. **Install Anki:**
   Download and install the Anki application from the official Anki website.

2. **Install Anki Connect:**
   Load the Anki Connect extension into your Anki application to enable API routing. [Download Anki Connect](url 1)

3. **Configure Anki Connect:**
   Follow the instructions provided in the Anki Connect documentation to configure it properly.

4. **Self-Host Anki (Optional):**
   If you prefer to self-host Anki using Docker, follow the instructions provided here: [Docker Installation Instructions](url 2)

5. **Install Super Anki Extension:**
   - Download the Super Anki extension for Raycast.
   - Follow the instructions in the Raycast documentation to install the extension.

## Usage

1. **Get Deck Names:**
   Use the `Get Deck Names` command to retrieve the names of all decks in your Anki collection.

2. **Add New Deck Names:**
   Use the `Add New Deck Name` command to create a new deck. You can nest decks using the `::` notation (e.g., `Deck1::subdeck1`).

3. **Get Notes from a Specific Deck:**
   Use the `Get Notes` command and specify the deck name to fetch notes from that deck.

4. **Add Notes to a Specific Deck:**
   Use the `Add Note` command to add a new note to a specific deck. Notes can be formatted using Markdown.

5. **Save Last Used Deck Name:**
   The extension saves the last used deck name globally to save time when creating or retrieving notes.

6. **Sync Anki Database:**
   Use the `Sync Anki Database` command to sync your Anki database and ensure all changes are up-to-date.

## Contributing

Contributions are welcome! If you have any suggestions or improvements, please submit a pull request or open an issue on the GitHub repository.

## License

This project is licensed under the MIT License. See the LICENSE file for more details.

---

Happy studying with Super Anki!

