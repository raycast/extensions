<img src="assets/icon.png" width="64" height="64" alt="Orange book icon">

# OrangeBook Thesaurus

Search synonyms and antonyms from Raycast. Results update as you type: matches stay on the left, and the selected entry's definition, synonyms, and antonyms stay on the right.

Synonyms and antonyms come from the [Datamuse API](https://www.datamuse.com/api/), ranked by how closely each word is related. Definitions come from Wiktionary and WordNet through the same API.

## Usage

- Type a word. The list refreshes automatically.
- Select a part of speech to read its definition, synonyms, and antonyms.
- The first chip row is the closest matches. Later rows are more distant.
- Press `⌘O` to open the word on Wiktionary.
- If nothing matches, choose a spelling suggestion to search it.

## Development

The Raycast CLI needs Node.js 22.22 or newer.

```bash
npm install
npm run dev
```
