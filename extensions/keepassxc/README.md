<div align="center">
  <img width="125" src="https://raw.githubusercontent.com/raycast/extensions/main/extensions/keepassxc/assets/keepassxc.png">

<h1>KeePassXC</h1>

Access your KeePass database directly from Raycast

Search entries &nbsp;⸱&nbsp; Copy & paste any field &nbsp;⸱&nbsp; Generate TOTP codes &nbsp;⸱&nbsp; Mark entries as favorites &nbsp;⸱&nbsp; Create new entries

</div>

## Requirements

To use this extension, you will need:

- [KeePassXC](https://keepassxc.org)

## Available Options

Configure the following preferences in the extension settings:

- **Inactivity Timer:** Automatically locks the database after a period of inactivity
- **Display Favicon:** Shows website favicons for entries

## Create Entry

The **Create Entry** command adds a new entry to your KeePass database using the same unlock and credential setup as Search.

- **Title** and **password** are required; **username** and **URL** are optional.
- The entry is placed in **Root** or an existing group. Only groups with entries visible in Search are listed — empty groups are not shown.
- Titles and passwords cannot contain line breaks, and the title cannot contain `/` (the CLI group separator).

### Before Saving

Close the database in KeePassXC before saving, and avoid other applications writing to the database while the form is open. After the entry is saved, reopen Search to see it in the list.

## Security

### Implementation

This extension leverages the KeePassXC command-line interface (CLI). All applicable CLI security considerations apply. For comprehensive details, refer to the [KeePassXC CLI documentation](https://keepassxc.org/docs/KeePassXC_UserGuide#_command_line_tool).

### Credential Storage

Your credentials required to access your KeePass database, which include a password and an optional key file, are securely stored in [Raycast's local encrypted database](https://developers.raycast.com/information/security#data-storage). This storage prevents other extensions from accessing the storage of that extension.

### Create Entry

In the Create Entry form, secrets you type (the entry password and, when unlocking, your master password) are passed to the KeePassXC CLI via standard input, never as command-line arguments, and are not stored in a separate form cache. The entry list cache maintained by Search (which may include passwords from your database) is stored in Raycast's local encrypted database as described above.
