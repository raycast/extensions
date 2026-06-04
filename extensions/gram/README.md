# Gram

Supercharge the [Gram editor](https://gram-editor.com) from within Raycast: manage Gram extensions, configure auto-updates, and quickly search, pin, or open your recent projects.

> **Requirement:** You must have the [Gram editor](https://gram-editor.com) installed on your system to use this extension.

---

## Features

*   **Search & Open Recent Projects:** Access your recently opened projects in Gram.
*   **Pin Favorites:** Pin your most frequently used workspaces to the top of the list for instant access.
*   **Quick Open in Gram:** Open files or projects directly from Raycast.
*   **Manage Extensions:** Search for, install, uninstall, update, or downgrade extensions.
*   **Background Updates:** Choose between automatic background updates or manual updates for your installed extensions.

---

## Extension Management

Discover extensions, inspect what is already installed, and manage updates and rollbacks without leaving Raycast.

### Advanced Search Filters

Use the search bar to match extensions by plain text, or narrow your search using specific field filters:

| Filter | Description |
| :--- | :--- |
| `id:` | Extension identifier |
| `name:` | Extension name |
| `desc:` | Description text |
| `version:` | Published version |
| `author:` | Author name |
| `repo:` | Repository URL |
| `schema:` | Schema version |
| `wasm:` | WASM API version |
| `provides:` | Capability or language support |
| `date:` | Publish date |
| `downloads:` | Download count |

### Dropdown Filters

The filter dropdown allows you to instantly narrow results by:

*   **Status:** `installed`, `not installed`, `outdated`, or `ignored`.
*   **Capabilities:** Any supported `provides` value.

### Available Actions

From each extension result, you can quickly:

*   **Install** the latest version of an extension (or a specific version).
*   **Update** an outdated extension.
*   **Uninstall** an extension.
*   **Ignore or Resume** updates for installed extensions.
*   **Open** the extension repository in your browser.
*   **Reveal** the installed extension in Finder.

> **Tip:** If any extensions are out of date, the view surfaces a dedicated updates section with a convenient **Update All** action.

---

## Credits & Acknowledgements

This extension is a fork of the [Raycast extension for Zed](https://www.raycast.com/ewgenius/zed-recent-projects), originally created by **ewgenius** and contributors (tleo19, jylamont, pernielsentikaer, tm.wrnr, true-real-michael, xmorse, ivens_joris).

This project would not have been possible without their work.
