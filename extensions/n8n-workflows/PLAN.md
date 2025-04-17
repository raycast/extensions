# Plan: Prepare n8n Raycast Extension for Store Submission

This document outlines the steps to prepare the n8n Raycast extension for submission to the Raycast Store, ensuring it meets the required guidelines and best practices.

**Goal:** Update the extension's metadata, documentation, assets, and code structure to comply with Raycast Store requirements.

**Current State:** The extension has core functionality but needs refinement in packaging, documentation, and cleanup.

**Key Decisions Made:**

*   The `activate-all-workflows` and `deactivate-all-workflows` commands will be removed as they are not deemed useful.
*   The `shell-env` dependency will be removed as it's likely unnecessary, relying solely on Raycast preferences for configuration.
*   The author will be set to `gregoryhadley`.

## Phase 1: Project Cleanup & `package.json` Update

**Objective:** Remove unused code and update the extension manifest (`package.json`) with accurate and complete information.

**Steps:**

1.  **Remove Unused Command Files:**
    *   Delete `src/activate-all-workflows.tsx`.
    *   Delete `src/deactivate-all-workflows.tsx`.
    *   Search the codebase for any imports or references to these files and remove them.
2.  **Update `package.json`:**
    *   **Confirm File:** Read the current `package.json`.
    *   **Apply Changes:**
        *   Set `"author": "gregoryhadley"`.
        *   Ensure `"icon": "assets/n8n.png"`. (Verify `assets/n8n.png` exists and is 128x128 later).
        *   Update `"description": "Search, manage, and trigger n8n workflows and webhooks."`.
        *   Add `"version": "1.0.0"`.
        *   Add `"keywords": ["n8n", "workflow", "automation", "webhook", "trigger", "API"]`.
        *   Update `"categories": ["Applications", "Productivity", "Developer Tools"]`.
        *   Remove the `preferences` block from within the `search-workflows` command definition.
        *   Add the `rememberFilter` preference block to the main top-level `preferences` array:
            ```json
            {
              "name": "rememberFilter",
              "title": "Remember Workflow Tag Filter",
              "description": "Persist the selected tag filter in the 'Search Workflows' command between sessions.",
              "type": "checkbox",
              "required": false,
              "label": "Remember Filter Selection",
              "default": true
            }
            ```
        *   Update the `search-workflows` command description: `"description": "Search, filter, activate, and deactivate n8n workflows."`.
        *   Ensure `activate-all-workflows` and `deactivate-all-workflows` are NOT listed in the `commands` array.
        *   Remove `"shell-env"` from the `dependencies` object.
        *   *(Optional but Recommended)* Consider updating `devDependencies` like `eslint` and `prettier` to newer versions if compatible.
        *   Ensure `scripts` include: `"build": "ray build -e dist"`, `"dev": "ray develop"`, `"fix-lint": "ray lint --fix"`, `"lint": "ray lint"`, `"publish": "ray publish"`.
    *   **Write Changes:** Write the updated content back to `package.json`.
3.  **Update `package-lock.json`:** Run `npm install` to update the lock file after removing dependencies.

## Phase 2: Documentation & Assets

**Objective:** Create comprehensive documentation (`README.md`, `CHANGELOG.md`) and ensure all necessary assets are present and correctly formatted.

**Steps:**

1.  **Update `README.md`:**
    *   **Read File:** Get the current content of `README.md`.
    *   **Apply Changes:**
        *   Update the title and description to match `package.json`.
        *   Add a clear "Setup" section explaining how to get the n8n API Key and Instance URL, and where to enter them in Raycast preferences. Link to n8n docs if possible.
        *   Add a "Features" or "Commands" section describing the remaining commands:
            *   Search Workflows
            *   Search Triggerable Webhooks
            *   Run Saved n8n Command
            *   Reset n8n Extension Storage
        *   Add placeholders for screenshots/GIFs for each UI command (to be added in the next step).
        *   Add a "Limitations" section if applicable.
    *   **Write Changes:** Write the updated content back to `README.md`.
2.  **Create/Update `CHANGELOG.md`:**
    *   **Read File:** Get the current content of `CHANGELOG.md`.
    *   **Apply Changes:**
        *   Ensure the format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
        *   Add an initial version section:
            ```markdown
            ## [1.0.0] - YYYY-MM-DD

            ### Added
            - Initial release
            - Search Workflows command (search, filter, activate/deactivate).
            - Search Triggerable Webhooks command (search, trigger).
            - Run Saved n8n Command feature.
            - Reset n8n Extension Storage command.
            - Preferences for n8n Instance URL and API Key.
            - Preference to remember workflow tag filter.
            ```
        *   Replace `YYYY-MM-DD` with the actual release date.
    *   **Write Changes:** Write the updated content back to `CHANGELOG.md`.
3.  **Verify/Prepare Assets:**
    *   **Check Extension Icon:** Confirm `assets/n8n.png` exists and is a 128x128 PNG.
    *   **Check UI Icons:** Confirm `assets/list-icon.svg` and `assets/empty-icon.png` (used in `empty-view.tsx`) exist.
    *   **Add Screenshots:** Create and add screenshots for the main UI commands (`search-workflows`, `search-webhook-workflows`, `run-saved-command`, `WebhookTriggerForm`, `TriggerFilterForm`, `SaveCommandForm`) into the `assets` folder (or a subfolder like `assets/screenshots`). Update the `README.md` to reference these screenshots using relative paths (e.g., `![Search Workflows](assets/screenshots/search-workflows.png)`). *Note: Creating screenshots is outside the scope of automated tools.*

## Phase 3: Final Polish & Testing

**Objective:** Ensure code quality, build the extension, and test thoroughly.

**Steps:**

1.  **Linting & Formatting:** Run `npm run fix-lint` to automatically fix linting and formatting issues according to the project's configuration (`.eslintrc.json`, `.prettierrc`).
2.  **Build Extension:** Run `npm run build` to create the production build in the `dist` folder.
3.  **Manual Testing:**
    *   Install the built extension from the `dist` folder locally in Raycast.
    *   Test **all** commands and features thoroughly:
        *   Valid/invalid API Key and URL.
        *   Searching/filtering workflows (tags, activation status).
        *   Activating/deactivating workflows.
        *   Searching/triggering webhooks.
        *   Saving webhook configurations.
        *   Running saved commands.
        *   Resetting storage.
        *   Preference persistence (`rememberFilter`).
        *   Empty states and error handling (`showToast`, `EmptyView`).
        *   Edge cases (special characters, large numbers of workflows, etc.).

## Phase 4: Submission

**Objective:** Publish the extension to the Raycast Store.

**Steps:**

1.  **Final Review:** Double-check `package.json`, `README.md`, `CHANGELOG.md`, and assets one last time.
2.  **Publish:** Run `npm run publish` and follow the prompts from the Raycast CLI.

---