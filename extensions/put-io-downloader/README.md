# Put.io

This Raycast extension allows you to interact with your Put.io account, browse files and transfers, and perform customizable actions on your files. Put.io is a cloud storage and download manager that enables you to fetch content from various sources and store it in your private and secure cloud space.

## Features

- Browse your Put.io files and folders
- View transfer status and details
- Perform actions on files, such as downloading, streaming, and deleting
- Customizable actions for specific file types

## Requirements

- The latest version of Raycast
- A Put.io account

## Installation

- Open Raycast and navigate to the Store.
- Locate this extension (Put.io) and choose Install.
- Enter your Put.io Client ID and OAuth token in the extension's preferences. These values can be found in Put.io under API. Choose "Create new app" and enter the values you want (you can ignore Application website and Callback URL), then go to "Applications created by you" and click View Secrets to get the values.
- Customize any actions and associated commands.

## Usage

Once the extension is installed and configured, you can use the following commands:

- Browse Files: Browse your Put.io files and folders, and perform actions on them.
- Browse Transfers: View your active and completed transfers, and manage them.
- For customizable actions, you can customize them via the Raycast Preferences > Extensions > Put.io. Enter the title of the action (e.g. 'Send to Google Drive'), the enter the local command to execute. Include `{0}` in the command and trhe extension will automatically populate it with the file URL when executing the action.

## Contributing

Contributions are welcome! Please submit a pull request or create an issue for any bug reports, feature requests, or improvements.

## License

This Raycast extension is released under the MIT License. See LICENSE for details.

## Disclaimer

This extension is not affiliated with or endorsed by Put.io. Use at your own risk.
