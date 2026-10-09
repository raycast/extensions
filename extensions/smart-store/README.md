# Smart Store

Find Raycast extensions by describing what you need, in any language.

- **Plain-language search**: type "manage the apps that open when I log in" instead of guessing an extension's exact name. AI turns your request into search terms, looks through titles, descriptions and commands, then ranks the results and explains why each one fits.
- **Descriptions in your language**: extension and command descriptions are translated into the language of your choice (your macOS language by default). Translations are cached locally.
- **Build what doesn't exist**: when no extension does what you need, Smart Store writes a plan and a ready-to-paste prompt for Claude, ChatGPT or Cursor, so you can build it yourself.
- **Everything you expect from the Store**: browse by popularity, recent additions, recent updates, category or installed extensions, see screenshots and commands, and open any extension in the Raycast Store to install it.

## Setup

Open the extension preferences to choose:

- **Description Language**: the language used for descriptions and AI explanations.
- **AI Provider**:
  - **Raycast AI** (default) requires Raycast Pro.
  - **Anthropic** or **OpenAI** use your own API key. Paste it in **API Key**. You can change the model in **Model**.
  - **None** keeps keyword search only. Descriptions are then translated with the free [MyMemory](https://mymemory.translated.net) service, on the details page and for the first results.

## Privacy

Your search requests are sent to the AI provider you choose. Extension data comes from the public Raycast Store listing. Nothing else leaves your Mac.
