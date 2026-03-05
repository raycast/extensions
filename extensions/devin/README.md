# Devin Raycast Extension

Launch and manage Devin sessions directly from Raycast.

## Features

### New Devin Session
Quickly launch a new Devin session with a prompt. Supports Raycast arguments so you can type your prompt inline without opening a form.

### List Devin Sessions
View all your Devin sessions with status indicators, grouped into Active and Completed sections. Actions include:
- **Open in Browser** (default) - opens the session in your browser
- **Archive Session** - terminates active sessions
- **Open All Sessions** - opens the Devin sessions page
- **Copy Session URL / ID**
- **Open Pull Request** - if the session has an associated PR

Filter sessions by All, Active, or Completed using the dropdown.

## Setup

1. Clone this repo
2. Run `npm install`
3. Run `npm run dev` to start the extension in development mode
4. When prompted, enter your Devin API token (personal API key starting with `apk_user_`)

## Development

```bash
npm run dev       # Start in dev mode with hot reload
npm run build     # Build the extension
npm run lint      # Run ESLint + Prettier checks
npm run fix-lint  # Auto-fix lint/format issues
```
