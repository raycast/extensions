---
name: raycast
description: "Best practices and workflows for developing and modifying Raycast Extensions (React/Node). Use when the user asks to create, update, or troubleshoot a Raycast extension, whether it interfaces with external APIs (Notion, Spotify) or executes local scripts (AppleScript, Keyboard Maestro)."
---

# Raycast Extension Development

This skill defines the preferred workflow and best practices for building, modifying, and troubleshooting custom Raycast extensions.

## 1. Scaffolding & Setup

- **Preferred Method (Duplication)**: The fastest way to start a new extension is often duplicating the folder of an *existing* extension. If you do this, you must carefully update the `package.json`:
  - `"name"`
  - `"title"`
  - `"description"`
  - `"author"`
  - `"commands"` array (update `name`, `title`, and `description`).
- **Standard Method**: If not duplicating, use `npx @raycast/api@latest create`.
- **Local Dev**: After creating/duplicating, run `npm install` followed by `npm run dev`. This automatically installs the extension in the user's Raycast app locally and starts the build watcher. 

## 2. General UI & UX Requirements

When modifying or creating forms and commands, adhere to these standards:

- **Clean Inputs**: Do not set `defaultValue` with placeholder characters (e.g., `- ` for bullet points) unless explicitly requested.
- **Auto-Close on Success**: After successfully completing an action (like adding a Notion page, running a system script, etc.), the extension should disappear and return the user to the root Raycast search, rather than retaining the form on-screen.
  - Import: `import { popToRoot } from "@raycast/api";`
  - Execute: `await popToRoot({ clearSearchBar: true });`
- **Icon Changes**: If an extension's icon is modified (e.g., `extension-icon.png`), the Raycast app must be fully restarted to reflect the change. **Always explicitly alert the user to "Restart Raycast" when you modify an icon.**

## 3. Data Fetching & State

- **Use `@raycast/utils`**: For dynamic data fetching (e.g., loading dropdown options from a Notion database, or fetching Spotify tracks), rely on `useCachedPromise` from the `@raycast/utils` library. This ensures fast initial loads and proper caching.
- **Dynamic Forms**: For fields like Notion's `select`, `multi_select`, or integrations with existing playlists, dynamic `Form.TagPicker` or `Form.Dropdown` components should be populated via `useCachedPromise` rather than hardcoding. 

## 4. Automation & Local Execution

When an extension requires triggering local MacOS functionality (where external APIs fall short or aren't applicable):
- **AppleScript & Keyboard Maestro**: Use Node's `child_process.exec` to run `osascript`. 
  - *Example*: `exec('osascript -e \'tell application "Keyboard Maestro Engine" to do script "MACRO_ID"\'')`
- **Clipboard Operations**: Always use the native `Clipboard` utilities from `@raycast/api` (e.g., `Clipboard.copy(text)`) rather than custom bash scripts.

## 5. Preferences & Authentication

When building an extension that requires an external API (like Notion or Spotify):
- Add the required secrets/tokens to the `preferences` array in `package.json`.
- **User Instructions**: You must proactively remind the user to configure the token when they first load the extension. For example, provide a short snippet:
  
  > ⚠️ **Integration Required**
  > You need to provide this extension with an API Token.
  > 1. Go to [Link to API dashboard]
  > 2. Create a new token.
  > 3. Open Raycast, run this new command, and paste the Token in the preferences when prompted.
