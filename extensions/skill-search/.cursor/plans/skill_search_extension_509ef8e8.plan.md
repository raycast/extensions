---
name: Skill Search Extension
overview: Build a Raycast extension that searches the skills.sh API, displays results in a list sorted by popularity, shows skill details on selection, and provides actions to copy or run the install command.
todos:
  - id: rewrite-main
    content: Rewrite src/skill-search.tsx with List view, API search via useFetch, and Skill type definitions
    status: pending
  - id: detail-view
    content: Implement SkillDetail component with Detail + Metadata showing install command, repo link, installs count
    status: pending
  - id: actions
    content: Add ActionPanel with Copy Install Command (Cmd+K), Send to Terminal (Cmd+Shift+Enter), Open in Browser (Cmd+O)
    status: pending
  - id: terminal-helper
    content: Implement runInTerminal helper using osascript to send command to macOS Terminal.app
    status: pending
  - id: test-and-polish
    content: Run npm run dev, test the extension, fix any lint errors or issues
    status: pending
isProject: false
---

# Skill Search Raycast Extension

## Architecture

The extension already has a scaffolded Raycast project at `[package.json](package.json)` with `@raycast/api` and `@raycast/utils` installed. We will rewrite `[src/skill-search.tsx](src/skill-search.tsx)` to implement the full functionality.

```mermaid
flowchart LR
    SearchBar["Search Bar Input"] --> Debounce["Throttled Search"]
    Debounce --> API["skills.sh/api/search"]
    API --> ListResults["List View\n(sorted by installs)"]
    ListResults --> DetailView["Detail View\n(pushed on Enter)"]
    ListResults --> CopyAction["Cmd+K: Copy\ninstall command"]
    ListResults --> TerminalAction["Cmd+Shift+Enter:\nSend to Terminal"]
    ListResults --> BrowserAction["Cmd+O: Open\nin Browser"]
```



## API Integration

- **Endpoint**: `https://skills.sh/api/search?q={query}&limit={limit}`
- **Response shape**: `{ skills: [{ id, skillId, name, installs, source }] }`
- Use `useFetch` from `@raycast/utils` with `keepPreviousData: true` to avoid flickering, and `execute: false` when query is empty
- Disable Raycast's built-in filtering (`filtering={false}`) since search is server-side
- Throttle search text changes (`throttle={true}`)

## UI Design

### List View (main screen)

- Each `List.Item` displays:
  - **title**: skill name (e.g., `remotion-best-practices`)
  - **subtitle**: source repo (e.g., `remotion-dev/skills`)
  - **accessories**: install count formatted with `K` suffix (e.g., `69.1K`)
- `List.EmptyView` with a prompt like "Search for agent skills" when no query

### Detail View (pushed on Enter)

- `Detail` component with markdown showing:
  - Skill name as heading
  - Install command in a code block
  - Link to skills.sh page
- `Detail.Metadata` sidebar with:
  - `Label`: Install count
  - `Link`: Repository on GitHub (`https://github.com/{source}`)
  - `Link`: View on skills.sh (`https://skills.sh/{id}`)
  - `Label`: Install command (copyable)

### Actions

On the **List View**:

- **Enter** (default): Push to Detail view
- **Cmd+K**: `Action.CopyToClipboard` -- copies `npx skills add {source} --skill {skillName}`
- **Cmd+Shift+Enter**: Custom action to send command to the default macOS Terminal via AppleScript (`osascript -e 'tell application "Terminal" to do script "..."'`)
- **Cmd+O**: `Action.OpenInBrowser` -- opens `https://skills.sh/{id}`

On the **Detail View**:

- **Enter** (default): `Action.CopyToClipboard` -- copies install command
- **Cmd+Shift+Enter**: Send to Terminal (same as list)
- **Cmd+O**: Open in browser

## File Changes

### `[src/skill-search.tsx](src/skill-search.tsx)` -- Complete rewrite

- Define `Skill` interface matching API response
- `formatInstalls(n)` helper to format numbers (e.g., `98186` -> `98.2K`)
- `getInstallCommand(skill)` helper returning `npx skills add {source} --skill {name}`
- `Command` component: `List` with `useFetch`, throttled `onSearchTextChange`
- `SkillDetail` component: `Detail` with metadata, pushed from list items
- `SkillActions` component: shared `ActionPanel` used in both List and Detail views
- `runInTerminal(command)` helper using `child_process.exec` with AppleScript to open Terminal and run the command

