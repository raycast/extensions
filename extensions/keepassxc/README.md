<div align="center">
  <img width="125" src="https://raw.githubusercontent.com/raycast/extensions/main/extensions/keepassxc/assets/keepassxc.png">

<h1>KeePassXC</h1>

Access your KeePass database directly from Raycast

Fuzzy search entries &nbsp;⸱&nbsp; Copy & paste any field &nbsp;⸱&nbsp; Generate TOTP codes &nbsp;⸱&nbsp; Mark entries as favorites

</div>

## Requirements

To use this extension, you will need:

- [KeePassXC](https://keepassxc.org)

## Search

### Text

Type anything in the search bar to search entry titles, usernames and folder names (URLs too):

- **Abbreviations:** `gh` finds GitHub, `cld` finds Claude
- **Typos:** `guthub` finds GitHub
- **Several words:** each word must match the entry, in any field and in any order (e.g. `cld admin` finds the Claude entry with the username admin)

### Folder

Pick a folder from the dropdown next to the search bar to only show its entries.

### Field Filters

To filter on a specific field, use the [KeePassXC search syntax](https://keepassxc.org/docs/KeePassXC_UserGuide#_searching) anywhere in the search bar. A filter is a field followed by a value:

| Field    | Short | Searches    |
| -------- | ----- | ----------- |
| `user:`  | `u:`  | Username    |
| `title:` | `t:`  | Title       |
| `url:`   |       | URL         |
| `group:` | `g:`  | Folder path |

Unlike text search, filters are strict: by default, the field must contain the value (case-insensitive). Change this with:

- **Modifiers** before the field: `-` or `!` to exclude, `+` for an exact match, `*` for a regular expression
- **Wildcards** in the value: `*` for anything, `?` for one character, `|` for OR
- **Quotes** for values with spaces

Filters and text can be combined: an entry must match all of them.

| Query                  | Description                                                |
| ---------------------- | ---------------------------------------------------------- |
| `github u:alice`       | Entries matching "github" whose username contains alice    |
| `user:john\|smith`     | Entries whose username contains john OR smith              |
| `u:adm?n`              | Entries whose username contains adm, any character, then n |
| `+u:johnsmith -t:test` | Username exactly johnsmith, title not containing test      |
| `g:"Shared Drive"`     | Entries in a folder whose path contains Shared Drive       |
| `-url:google.com`      | Entries whose URL doesn't contain google.com               |

## Available Options

Configure the following preferences in the extension settings:

- **Inactivity Timer:** Automatically locks the database after a period of inactivity
- **Display Favicon:** Shows website favicons for entries (enabled by default)

## Security

### Implementation

This extension leverages the KeePassXC command-line interface (CLI). All applicable CLI security considerations apply. For comprehensive details, refer to the [KeePassXC CLI documentation](https://keepassxc.org/docs/KeePassXC_UserGuide#_command_line_tool).

### Credential Storage

Your credentials required to access your KeePass database, which include a password and an optional key file, are securely stored in [Raycast's local encrypted database](https://developers.raycast.com/information/security#data-storage). This storage prevents other extensions from accessing the storage of that extension.
