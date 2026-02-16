# Voicenotes Raycast Extension Implementation Plan

## Goal
Build a Raycast extension to interact with Voicenotes.com via their Obsidian integration API.

## Proposed Changes

### Project Structure
- Directory: `/Users/agentbond/.gemini/antigravity/scratch/voicenotes-raycast`
- We will NOT use `npx raycast develop` directly if it relies on interactive prompts that block execution. Instead, we will construct the necessary files manually or use `npx` with flags if available. Raycast extensions have a specific structure:
    - `package.json`: Manifest
    - `src/`: Source code
    - `assets/`: Icons
    - `tsconfig.json`: TypeScript config

### Components

#### 1. Manifest (`package.json`)
- Define commands: `search-notes` (view), `latest-note` (menu-bar).
- Define preferences: `token` (password type).

#### 2. API Client (`src/api.ts`)
- Base URL: `https://api.voicenotes.com/api/integrations/obsidian-sync`
- Headers:
    - `Authorization: Bearer <token>`
    - `X-API-KEY: <token>`
- Types/Interfaces for Recording objects.

#### 3. Commands

**Search Notes (`src/search-notes.tsx`)**
- `List` component.
- `useFetch` hook to get `/recordings`.
- `List.Item` showing title and summary.
- `ActionPanel` with `Action.Push` to Detail view and `Action.OpenInBrowser`.

**Latest Note (`src/latest-note.tsx`)**
- `MenuBarExtra` component.
- Fetch latest recording.
- Show title in menu bar.

## Verification Plan
### Automated Tests
- TypeScript compilation check (`npm run build`).
- ESLint check (`npm run lint`).

### Manual Verification
- Since I cannot run the Raycast app itself (it's a GUI macOS app), I will verify the code builds successfully and the structure matches Raycast documentation.
- The user will need to run `npm install` and `npm run dev` to load it into Raycast.
