# Value Vault

Store values by label, search them, and copy them to your clipboard instantly.

Value Vault is a personal value store for Raycast. It solves the common problem of needing to frequently look up the same values — API keys, server URLs, phone numbers, database connection strings, Wi-Fi passwords, configuration tokens — without digging through notes apps, password managers, or scrolling through clipboard history.

## Commands

### Browse Values

Search all your saved values with Raycast's built-in fuzzy filtering. Each entry shows its label, a masked preview of the value (revealable), its type badge, and a relative timestamp.

| Action | Shortcut | Description |
|--------|----------|-------------|
| Copy Value | `↵` | Copies the value to your clipboard |
| Show / Hide Value | `⌘Y` | Reveals or re-masks the value preview |
| Paste Value | `⌘↵` | Pastes the value into the frontmost app |
| Copy as JSON | `⌘⇧C` | Copies `{label, value, type}` as JSON |
| Edit Value | `⌘E` | Opens the edit form |
| Duplicate | `⌘D` | Creates a copy with "(copy)" appended to the label |
| Delete Value | `⌃X` | Deletes after confirmation |

Press `⌘N` from the list to add a new value.

### Add Value

Save a new value with a label. The type is auto-detected from the value — supported types:

| Type | Auto-detected when |
|------|--------------------|
| URL | Starts with `http://` or `https://` |
| Email | Contains `@` with a domain |
| JSON | Valid JSON parse succeeds |
| Number | Contains only digits, decimals, and an optional minus sign |
| Color | Matches `#rgb` or `#rrggbb` format |
| String | Everything else |

You can override the detected type via the dropdown.

## Data

All values are stored locally using Raycast's built-in `LocalStorage` API. Data is encrypted at rest and never leaves your machine. No cloud, no accounts, no subscriptions.

## Installation

### From the Raycast Store

Search for **Value Vault** in the Raycast Store and install with one click.

### Development / Manual

```bash
git clone https://github.com/seppealaerts/value-vault.ringtail.dev.git
cd value-vault.ringtail.dev
npm install
npm run build
```

Then in Raycast:
1. Open Raycast (`⌘Space`)
2. Search for **Import Extension**
3. Select the `value-vault.ringtail.dev` folder

For development with hot-reload:

```bash
npm run dev
```
