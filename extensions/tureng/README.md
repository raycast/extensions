# [Tureng for Raycast](https://github.com/agmmnn/tureng-raycast)

<img width="1000" height="625" alt="tureng-raycast" src="https://github.com/user-attachments/assets/980e751e-bd4a-4c90-b913-bd9ca196fe04" />

A fast, lightweight [Tureng](https://tureng.com) English-Turkish dictionary for Raycast.

#### Features

- **Bilingual results** — `EN → TR` and `TR → EN` translations grouped separately
- **Live autocomplete** — suggestions from Tureng as you type
- **Drill-down navigation** — look up any result to go deeper
- **Paste into app** — insert translations directly at your cursor
- **Selected text lookup** — translate from any app with a hotkey
- **Did you mean?** — smart suggestions when a word isn't found
- **Favorites** — save and manage words for vocabulary building
- **Pronunciation** — listen to how words are pronounced
- **Deeplinks** — trigger lookups from scripts and automation tools

## Commands

### Tureng Translate

Look up any word or phrase. Results are split into `EN → TR` and `TR → EN` sections showing the term, category, and type. Select any result to drill down further, paste it into your current app, or open the Tureng page in your browser.

https://github.com/user-attachments/assets/4233b0f8-ca46-4dd2-9f28-d51d7addf164

> <kbd>Tab</kbd> to enter a word, <kbd>⏎</kbd> to drill down into a result, <kbd>⌫</kbd>/<kbd>␛</kbd> to go back.

### Tureng Selected Text Lookup

Select any text in any app — browser, editor, PDF reader, terminal — and translate it instantly without switching windows. Pair it with a global hotkey for the fastest possible workflow.

https://github.com/user-attachments/assets/28175247-5eb8-4bb1-bcdd-95760686bcd6

> In this demo, <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>R</kbd> is assigned as the hotkey.
> To assign a hotkey, right click the command → Configure Command → Record Hotkey.

### Tureng Search

Start typing and get live autocomplete suggestions from Tureng. Pick any suggestion to see its full translations. Great when you're unsure about spelling or want to explore related words.

https://github.com/user-attachments/assets/952e2dd8-df5e-4497-afc8-229af709dd5a

### Tureng Favorites

Build your personal word list. Save words from any translation view with <kbd>Cmd</kbd>+<kbd>S</kbd>, then browse, filter, or look them up again anytime.

## Shortcuts

| Key                                                         | Action                               |
| ----------------------------------------------------------- | ------------------------------------ |
| <kbd>Enter</kbd>                                            | Look up term                         |
| <kbd>Shift</kbd>+<kbd>Enter</kbd>                           | Paste translation into frontmost app |
| <kbd>Opt</kbd>+<kbd>Enter</kbd>                             | Open on tureng.com                   |
| <kbd>Cmd</kbd>+<kbd>S</kbd>                                 | Save to favorites                    |
| <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>C</kbd>                | Copy term                            |
| <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>Alt</kbd>+<kbd>C</kbd> | Copy all translations                |
| <kbd>Cmd</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd>                | Open pronunciation                   |

## Deeplinks

Trigger a lookup from scripts, Shortcuts, or any app:

```
raycast://extensions/gokce/tureng/search-tureng?arguments=%7B%22query%22%3A%22hello%22%7D
```

## Development

```bash
git clone https://github.com/agmmnn/tureng-raycast.git
cd tureng-raycast
npm install
npm run dev
```

This opens the extension in Raycast in development mode. Changes are rebuilt automatically.

```bash
npm run build    # production build
npm run lint     # check for lint errors
npm run fix-lint # auto-fix lint errors
```

## License

MIT
