# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension called "Translate AI" - a translation tool that integrates with Raycast on macOS and Windows.
The extension translates selected text (captured automatically) or text provided in the textarea to a selected target language.
Supported languages: English (en), Polish (pl), Russian (ru).

## Development Commands

### Build and Run
```bash
npm run build        # build the extension using ray build
npm run dev          # run in development mode using ray develop
```

### Linting
```bash
npm run lint         # check code style with ray lint
npm run fix-lint     # auto-fix linting issues with ray lint --fix
```

### Publishing
```bash
npm run publish      # publish to Raycast Store using @raycast/api publish
```

Note: Direct npm publish is blocked - use `npm run publish` for Raycast Store deployment.

## Architecture

### Extension Structure
- Single command extension with one view mode command: "Translate AI"
- Main entry point: `src/translate-ai.tsx`
- Claude API integration: `src/claude-api.ts`
- OpenAI API integration: `src/openai-api.ts`
- Translation prompts: `src/prompts.ts`
- Types and constants: `src/types.ts`
- Extension metadata: defined in `package.json` with Raycast schema
- Auto-generated type definitions: `raycast-env.d.ts` (generated from manifest, do not modify)

### API Integration
The extension supports two AI providers:
- **Claude** (`claude-api.ts`): Uses Claude Haiku 4.5 model (claude-haiku-4-5-20251001)
- **OpenAI** (`openai-api.ts`): Uses GPT-5-mini model

Both modules export `translateText()` with the same signature. Claude is preferred when both keys are provided.

### Configuration
Configure API keys in Raycast extension preferences:
1. Open Raycast
2. Go to Extensions → Translate AI → Preferences
3. Enter your Anthropic API key (`sk-ant-...`) and/or OpenAI API key (`sk-...`)

At least one API key is required.

### Key Technologies
- **Raycast API** (`@raycast/api`): Core framework for building Raycast extensions
- **React**: UI components using React with TypeScript
- **TypeScript**: Strict mode enabled with ES2023 target

### Main Component Pattern
The extension uses Raycast's Form component pattern:
- `getSelectedText()`: Captures currently selected text from the system on load
- Form state management with React hooks (`useState`, `useEffect`)
- `ActionPanel` with `ActionPanel.Submenu` for language selection
- Form components: `Form.TextArea`, `Form.Separator`
- Toast notifications for success/error feedback

### Data Flow
1. Extension loads and attempts to capture selected text via `getSelectedText()`
2. Source text is displayed in first textarea (editable)
3. User selects target language from submenu (EN/PL/RU)
4. Translation API call is made with loading state
5. Translation result appears in second textarea
6. Toast notification shows success or error message

### Shared Constants
- `LANGUAGES`: Language definitions (code, label, full name) in `types.ts`
- `TOAST_MESSAGES`: All user-facing toast messages in `types.ts`

## TypeScript Configuration
- Strict mode enabled
- CommonJS modules
- ES2023 target and lib
- JSX transforms to React JSX (react-jsx)
- Isolated modules for better build performance
