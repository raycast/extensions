<div align="center">
  <img width="125" src="https://raw.githubusercontent.com/raycast/extensions/main/extensions/keepassxc/assets/keepassxc.png">

<h1>KeePassXC</h1>

Access your KeePass database directly from Raycast

Search entries &nbsp;⸱&nbsp; Copy & paste any field &nbsp;⸱&nbsp; Generate TOTP codes &nbsp;⸱&nbsp; Mark entries as favorites

</div>

## Requirements

To use this extension, you will need:

- [KeePassXC](https://keepassxc.org)

## Available Options

Configure the following preferences in the extension settings:

- **Inactivity Timer:** Automatically locks the database after a period of inactivity
- **Display Favicon:** Shows website favicons for entries

## Security

### Implementation

This extension leverages the KeePassXC command-line interface (CLI). All applicable CLI security considerations apply. For comprehensive details, refer to the [KeePassXC CLI documentation](https://keepassxc.org/docs/KeePassXC_UserGuide#_command_line_tool).

### Credential Storage

Your credentials required to access your KeePass database, which include a password and an optional key file, are securely stored in [Raycast's local encrypted database](https://developers.raycast.com/information/security#data-storage). This storage prevents other extensions from accessing the storage of that extension.
