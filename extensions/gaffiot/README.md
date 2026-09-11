# Gaffiot Latin-French Dictionary

Offline look-up in the **Gaffiot 2016**, the revised edition ("komarov" version) of Félix Gaffiot's _Dictionnaire illustré latin-français_ (Hachette, 1934) by Gérard Gréco, Mark De Wilde, Bernard Maréchal and Katsuhiko Ôkubo: 72,163 Latin headwords with their French definitions.

## First Launch

The dictionary data is **not bundled** with the extension. On first launch, the source file (27 MB) is downloaded from [Gaffiot/digital-gaffiot-json](https://github.com/Gaffiot/digital-gaffiot-json) and converted on your Mac. After that, search works entirely offline.

## Search

- case, vowel lengths (ā, ă…) and the **i/j**, **u/v**, **æ/ae** spellings are ignored;
- ranking: exact headword → starts with → contains (3 letters or more);
- the dictionary doesn't lemmatize: search for `amo`, not `amavit`.

## Shortcuts

| Action                              | Shortcut |
| ----------------------------------- | -------- |
| Show / hide entry                   | ↩ or ⌘D  |
| Copy entry as text                  | ⌘↩       |
| Copy entry as Markdown              | ⌘⇧C      |
| Copy headword with vowel lengths    | ⌘⇧M      |
| Paste "headword — first line"       | ⌘⇧↩      |
| Open in Lexilogos                   | ⌘O       |
| Legal notice                        | ⌘I       |

## Data and License

Full legal notice: [`NOTICE.md`](NOTICE.md), also available in Raycast (**Legal Notice** action, ⌘I).

- Data: **Gaffiot 2016**, komarov-1.1 version of May 2, 2016, © Gérard Gréco 2015-2016. Authors: Gérard Gréco, Mark De Wilde, Bernard Maréchal, Katsuhiko Ôkubo.
- Latest version of the resource: <http://gerardgreco.free.fr/spip.php?article47>
- Source file: JSON conversion of October 24, 2017, [Gaffiot/digital-gaffiot-json](https://github.com/Gaffiot/digital-gaffiot-json) (commit `61573a2`).
- Data license: **Creative Commons BY-NC-ND 4.0**. The extension does not redistribute the data and does not modify the text: only its TeX markup is converted to Markdown for display, locally.
- The extension's code is released under the MIT license.

## Development

```bash
npm install
npm run dev      # imports the extension into Raycast in development mode
npm run notice   # regenerates NOTICE.md from src/legal.ts
```
