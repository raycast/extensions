# DeepL Tools

Fast two-way DeepL translation for Raycast. Pick your primary and secondary languages once, then translate selected text, clipboard content, or anything you type.

## Commands

- **Translate with DeepL** translates selected text first, typed text second, and clipboard text as a fallback.
- **Translate Clipboard** translates clipboard text immediately.
- **Translate Text** provides a text area plus a full translation view with copy and paste actions.

Short translations appear as a compact notification. Longer translations open in a readable detail view.

## Why DeepL Tools?

Deepcast is useful when you want to choose among many target languages. DeepL Tools is intentionally optimized for one everyday language pair: configure it once, then translate selected, typed, or clipboard text in either direction without opening a language picker. Short results appear immediately, while every longer result remains available in the full copy-and-paste view.

## Setup

The first time you run a command:

1. Raycast securely asks for your DeepL API key.
2. DeepL Tools asks for your primary and secondary languages.

To get the key:

1. Open [DeepL API Keys](https://www.deepl.com/your-account/keys).
2. Sign in or create a **DeepL API Free** account.
3. Copy the **Authentication Key for DeepL API** shown on that page.
4. Paste it into the Raycast first-run screen.

The extension itself is free; DeepL API Free includes a monthly character allowance subject to DeepL's current limits. DeepL also documents authentication in its [API quick start](https://developers.deepl.com/docs/getting-started/auth).

The extension uses the DeepL API Free endpoint. Run **Configure Languages** whenever you want to change your pair; change the API key in Raycast's extension preferences.

## Share with friends

Until the extension is published in the Raycast Store, a friend can install it from source:

```bash
git clone https://github.com/nextster/deepl-raycast.git
cd deepl-raycast
npm install
npm run dev
```

Raycast opens the local extension and shows the first-run setup. Each person uses their own DeepL key; keys are stored by Raycast and are never committed to this repository.

## Smart direction

The extension detects which of your configured languages the text resembles. Primary-language text goes to the secondary language; secondary-language text goes to the primary language. Very short or ambiguous phrases are constrained to your configured pair, avoiding unrelated-language guesses such as reading the English word “dog” as Danish.

## Development

```bash
npm install
npm run lint
npm test
npm run build
```
