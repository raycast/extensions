# URL Editor Pro

A productivity-focused Raycast extension for parsing, editing, and managing URLs with advanced features like query parameter editing, QR code generation, clipboard integration, URL template variants, and custom aliases for easy recall.

## Features

- **URL Parsing & Editing**  
  Instantly parse and edit any URL. Modify protocol, host, path, hash, and query parameters in a user-friendly form.

  - **Shortcut:** <kbd>Enter</kbd> to parse and edit the current input URL.

- **Query Parameter Management**  
  Add, edit, or remove query parameters with ease.

  - **Shortcut:** <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> to add a new query parameter.

- **URL Template Variants** ⭐ New  
  Generate multiple URL variants from a single URL using customizable templates. Perfect for quickly navigating to parent paths, removing query parameters, or creating shortened URLs.

  - **Shortcut:** <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd> to generate URL variants.
  - **Shortcut:** <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>T</kbd> to manage template groups.

- **Alias Support**  
  Assign a memorable alias to any URL for quick recall and search in your history.

  - **Field:** Alias can be set in the edit form.

- **History with Search**  
  All parsed URLs are saved in a searchable history. Search by URL or alias.

  - **Shortcut:** <kbd>Cmd</kbd> + <kbd>Backspace</kbd> to clear all history.
  - **Shortcut:** <kbd>Cmd</kbd> + <kbd>Delete</kbd> to delete a single history item.

- **Clipboard Integration**  
  Detects URLs in your clipboard and prompts you to parse and edit them with a single keystroke.

  - **Shortcut:** <kbd>Cmd</kbd> + <kbd>Enter</kbd> to fill and parse the detected clipboard URL.

- **QR Code Generation**  
  Generate and save QR codes for any URL.
  - **Shortcut:** <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> to copy the URL.
  - **Shortcut:** <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd> to save/pin to history.

## Setup

No API keys or external configuration required. Just install and use!

## Usage

1. **Paste or type a URL** in the search bar.
2. **Press <kbd>Enter</kbd>** to parse and edit the current input URL.
3. **Edit** any part of the URL, including query parameters.
4. **Press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>** to add a new query parameter.
5. **Add an alias** (optional) to make the URL easy to find later.
6. **Press <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>** to save/pin to history.
7. **Search** your history by URL or alias.
8. You can clear all history, or delete a single item.
9. **Generate a QR code** for any URL and save it to your computer.
10. **Clipboard detection:** If a URL is detected in your clipboard, you'll be prompted to parse and edit it. **Press <kbd>Cmd</kbd> + <kbd>Enter</kbd>** to fill and parse.

## Extension Guidelines

- All user data (URLs, aliases) is stored locally and never shared.
- No external services or credentials are required.
- The extension is designed for productivity and respects Raycast's [community guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store).

## Template Variables

Templates use Mustache-style `{{variable}}` syntax to generate URL variants.

### Basic Variables

| Variable       | Description             | Example Output                                     |
| -------------- | ----------------------- | -------------------------------------------------- |
| `{{url}}`      | Full original URL       | `https://github.com/raycast/extensions?tab=readme` |
| `{{protocol}}` | Protocol                | `https`                                            |
| `{{host}}`     | Hostname                | `github.com`                                       |
| `{{hostname}}` | Hostname (alias)        | `github.com`                                       |
| `{{port}}`     | Port number             | `8080` (empty if none)                             |
| `{{path}}`     | Full path               | `/raycast/extensions`                              |
| `{{query}}`    | Query string (with `?`) | `?tab=readme`                                      |
| `{{hash}}`     | Hash/anchor (with `#`)  | `#installation`                                    |

### Path Level Selection

Use `{{path:N}}` to select path segments. Supports both positive and negative indices (Python-style):

```
Original path: /raycast/extensions/pull/aabbcc (4 segments)

Positive indices (from start):
{{path:1}}  → /raycast
{{path:2}}  → /raycast/extensions
{{path:3}}  → /raycast/extensions/pull
{{path:4}}  → /raycast/extensions/pull/aabbcc

Negative indices (from end):
{{path:-1}} → /raycast/extensions/pull/aabbcc (full path)
{{path:-2}} → /raycast/extensions/pull        (remove last 1)
{{path:-3}} → /raycast/extensions             (remove last 2)
{{path:-4}} → /raycast                        (remove last 3)
```

### Path Hierarchy Expansion ⭐

Use `{{path:*}}` to automatically expand into multiple URLs, from the first segment to the full path:

**Template:**

```
{{protocol}}://{{host}}{{path:*}}
```

**Input:** `https://github.com/raycast/extensions/pull/aabbcc`

**Output (4 URLs):**

```
https://github.com/raycast
https://github.com/raycast/extensions
https://github.com/raycast/extensions/pull
https://github.com/raycast/extensions/pull/aabbcc
```

### Template Examples

| Template                                | Effect                               |
| --------------------------------------- | ------------------------------------ |
| `{{protocol}}://{{host}}`               | Domain only                          |
| `{{protocol}}://{{host}}{{path}}`       | Remove query and hash                |
| `{{protocol}}://{{host}}{{path:2}}`     | Truncate to first 2 path segments    |
| `{{protocol}}://{{host}}{{path:*}}`     | Generate all path hierarchy variants |
| `{{protocol}}://another.host{{path:*}}` | Replace any part in your URL         |

## Contributing

Contributions and feature requests are welcome! Please open an issue or pull request.
