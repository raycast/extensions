# Roadmap

## ✅ Implemented Features

### 1. Multi-Provider Support
- OpenRouter, Google Gemini, OpenAI, Anthropic Claude, Ollama (Local), Groq
- Provider selection dropdown in preferences
- Per-provider API key fields

### 2. History of Enhanced Prompts
- Saves last 20 enhanced prompts using LocalStorage
- "View History" command to browse and reuse past enhancements
- Copy enhanced or original prompts from history
- Delete individual items or clear all

### 3. Enhancement Styles
- Balanced, Concise, Detailed, Creative, Technical
- Each style has a custom system prompt optimized for its purpose
- Selectable via preferences dropdown

### 4. Compare View
- Side-by-side view of original vs enhanced prompt
- Copy, paste, or edit and retry options
- Shows provider, model, and style used

### 5. Custom System Prompt
- User-defined additional instructions via preferences
- Appended to the selected style's base prompt

### 6. Paste Enhanced Prompt
- Direct paste to active application with ⇧⌘+Return
- No need to manually paste after copying

### 7. Favorite Models Quick-Switch
- Action menu submenu with 6 preset favorite models
- One-click switching between GPT-4o, Claude, Gemini, Llama, etc.
- Uses provider override for on-the-fly model switching

### 8. Prompt Templates
- "Use Template" command with 8 pre-defined templates
- Code Review, Explain Code, Refactor, Write Tests
- Documentation, Debug Help, Brainstorm Ideas, Summarize
- Templates use {input} placeholder for user content

---

## ✅ Compliance & Best Practices
- Removed unnecessary node-fetch dependency (using native fetch)
- CHANGELOG uses {PR_MERGE_DATE} placeholder
- Proper error handling throughout

---

## Contributing

Feel free to suggest new features! Open an issue to discuss implementation.
