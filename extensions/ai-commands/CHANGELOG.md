# ai-commands Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Initial release of the **AI Commands** extension.
- **Multi-Provider Support**: Connect to local models via **Ollama** or custom providers including **OpenAI**, **Anthropic**, **OpenRouter**, **Groq**, and any OpenAI-compatible API endpoint.
- **AI Chat**: Full-featured interactive chat supporting conversation history, model switching, creativity/temperature control, and integrated web search and web fetch tools.
- **Quick AI**: Instant floating prompt for fast answers and quick queries without interrupting your workflow.
- **Built-in AI Commands**:
  - **Ask Selected Text**: Ask AI questions about highlighted text.
  - **Ask Webpage**: Query the contents of your active browser tab.
  - **Summarize Website**: Extract key takeaways and clean summaries from open webpages.
  - **Explain This in Simple Terms**: Break down complex words or ideas with straightforward definitions.
  - **Explain Code Step by Step**: Clear walkthroughs of code snippets and functions.
  - **Fix Spelling & Grammar**: Correct errors while preserving original tone and formatting.
  - **Improve Writing**: Polish clarity, flow, and conciseness.
  - **Make Shorter / Make Longer**: Expand or trim text dynamically.
  - **Change Tone**: Effortlessly switch tone to Friendly, Professional, Confident, or Casual.
  - **Translate**: Translate text across languages.
  - **Rephrase as Tweet**: Generate punchy, social-ready posts.
  - **Vision Support**: Describe image contents or extract text directly from clipboard images or Finder selections.
- **Custom AI Commands**:
  - Create reusable custom commands with custom prompt templates supporting `{selection}`, `{browser-tab}`, and `{image}` placeholders.
  - Configure individual provider, model, creativity level, thinking effort, and keep-alive duration.
  - Select execution mode: interactive **Show View** or seamless **Replace Selection** in place.
  - Automatic slugification from command titles for clean, deterministic command IDs without UUIDs.
  - Built-in duplicate detection and collision prevention.
- **Manage AI Commands**:
  - Unified command list with icons to configure settings for both built-in and custom AI commands.
  - Create Raycast Quicklinks directly to run custom commands via global hotkeys.
- **Manage Custom Providers**: Add, edit, or toggle custom AI providers and model catalogs.
- **Manage Models**: Browse, pull, and delete Ollama models directly from Raycast.
- **MCP Server**: Integrated Model Context Protocol server exposing web search and web content retrieval.
