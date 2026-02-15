# Synonym CLI Raycast Extension

A Raycast extension to look up synonyms, antonyms, and related words using Thesaurus.com and Datamuse API.

## Features

- **Thesaurus**: Search for synonyms and antonyms with definitions.
- **Datamuse**: Explore words by meaning, sound, spelling, and more. Supports `word:topic` syntax.

## Development

1.  Install dependencies:

    ```bash
    npm install
    ```

2.  Build:
    ```bash
    npm run build
    ```

## Testing

You can test the API fetching logic using the scripts in `scripts/`:

```bash
npx tsx scripts/test-thesaurus.ts
npx tsx scripts/test-datamuse.ts
```
