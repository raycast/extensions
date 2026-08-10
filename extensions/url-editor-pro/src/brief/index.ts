/**
 * Brief usage guide for URL Editor Pro
 */

export const WELCOME_BRIEF = `
## URL Editor Pro

Parse, edit, and manage URLs with ease.

### Quick Start

| Action | Shortcut |
|--------|----------|
| Parse & Edit URL | \`Enter\` |
| Generate Variants | \`CMD + Shift + V\` |
| Manage Templates | \`CTRL + Shift + T\` |
| Add Query Param | \`CMD + Shift + A\` |
| Pin to History | \`CMD + Shift + P\` |

### Features

- **Edit** protocol, host, path, query, hash
- **Generate** URL variants with templates
- **QR Code** for any URL
- **Search** history by URL or alias
`;

const QUICK_START_TABLE = `
| Action | Shortcut |
|--------|----------|
| Parse & Edit URL | \`Enter\` |
| Generate Variants | \`CMD + Shift + V\` |
| Manage Templates | \`CMD + Shift + T\` |
| Add Query Param | \`CMD + Shift + A\` |
| Pin to History | \`CMD + Shift + P\` |
`;

export const CLIPBOARD_DETECTED_BRIEF = (url: string) => `
## URL Detected in Clipboard

\`\`\`
${url}
\`\`\`

**Press Enter** to parse and edit this URL.

---

### Quick Start
${QUICK_START_TABLE}
`;

export const URL_INPUT_BRIEF = (url: string) => `
## Ready to Parse

\`\`\`
${url}
\`\`\`

**Press Enter** to parse and edit.

---

### Quick Start
${QUICK_START_TABLE}
`;

/**
 * Edit form shortcuts
 */
export const EDIT_FORM_SHORTCUTS = {
  default: `⌘↵  Copy to Clipboard
⇧⌘↵  Show QR Code
⇧⌘A  Add Query Parameter
⇧⌘P  Pin to History`,

  addingQuery: `Fill in key & value, then press ⇧⌘A again to save`,
};
