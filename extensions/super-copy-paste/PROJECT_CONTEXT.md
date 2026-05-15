# Super Copy/Paste - Project Context & Implementation Plan

## 1. Project Overview
**Super Copy/Paste** is a Raycast extension designed to streamline text manipulation during the copy-and-paste process. It allows users to define a series of regular expression (Regex) cleanup rules that are automatically applied either right after copying selected text or right before pasting text from the clipboard.

## 2. Core Commands & Features
Since Raycast does not support creating dynamic commands at runtime, the extension provides 3 "Super Copy" and 3 "Super Paste" commands out-of-the-box. This gives users the flexibility to set up different sets of rules for different tasks.

### A. Super Copy Commands (`super-copy-1`, `super-copy-2`, `super-copy-3`)
- **Mode:** `no-view`
- **Functionality:** 
  1. Catches the currently selected text using Raycast's `getSelectedText()`.
  2. Applies the active user-defined regex "Find and Replace" rules specific to that command slot.
  3. Copies the processed text to the system clipboard using `Clipboard.copy()`.

### B. Super Paste Commands (`super-paste-1`, `super-paste-2`, `super-paste-3`)
- **Mode:** `no-view`
- **Functionality:**
  1. Retrieves the current text from the system clipboard using `Clipboard.readText()`.
  2. Applies the active user-defined regex "Find and Replace" rules specific to that command slot.
  3. Pastes the processed text into the active application using `Clipboard.paste()`.

### C. Manage Rules
- **Mode:** `view` (UI)
- **Functionality:** A user interface allowing users to:
  - **Select a Target Command** (e.g., "Super Copy 1", "Super Paste 2") to edit its specific rules.
  - **Create** new regex cleanup rules (specifying Find pattern, Replace pattern, and Rule Name).
  - **Edit** existing rules.
  - **Delete** rules.
  - **Sort/Reorder** rules to define the exact sequence of execution.
  - **Toggle** active/inactive states for individual rules.
- **Storage:** Uses Raycast's `LocalStorage` API to persist the rules. The data is keyed by the command identifier (e.g., `rules_super-copy-1`).

## 3. Data Structure
The rules should be stored as serialized JSON arrays, separated by the command they belong to. A single rule interface will look like:
```typescript
interface RegexRule {
  id: string;          // Unique identifier (UUID)
  name: string;        // Human-readable name for the rule
  findPattern: string; // The regex pattern to search for
  replaceWith: string; // The replacement string
  isActive: boolean;   // Whether the rule should be applied
}

// Stored in LocalStorage under keys like:
// 'rules_super-copy-1', 'rules_super-paste-1', etc.
type CommandRules = RegexRule[];
```

## 4. Development Roadmap
- **Phase 1: Project Restructuring (COMPLETED)**
  - Update `package.json` to define the 6 execution commands (`super-copy-1` to `3`, `super-paste-1` to `3`) and the `manage-rules` command.
  - Create the corresponding `.ts` entry points for the 6 commands.

- **Phase 2: Rule Management UI (COMPLETED)**
  - Build a React-based List view for the `manage-rules` command.
  - Implement a dropdown/selector to switch between the 6 command profiles.
  - Create forms to add and edit regex rules.
  - Implement LocalStorage persistence keyed by the selected command profile.
  - Add actions for moving rules up/down in the list.

- **Phase 3: Execution Engine (COMPLETED)**
  - Create a shared utility function (e.g., `applyRules(text: string, rules: RegexRule[]): string`) to safely parse and execute the regex rules against a text string.
  - Create a utility to load the rules for a given command ID from LocalStorage.

- **Phase 4: Implement Execution Commands (COMPLETED)**
  - Integrate the execution engine with the 3 `super-copy` commands.
  - Integrate the execution engine with the 3 `super-paste` commands.
  - Handle edge cases (e.g., no text selected, invalid clipboard content, regex evaluation errors).
