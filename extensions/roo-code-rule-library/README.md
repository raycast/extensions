# Roo Code Rule Library Raycast Extension

This Raycast extension allows you to manage "Roo Code rules" and apply them directly to your active VS Code project folder.

## Features

*   **Rule Library:** Maintain a centralized library of reusable code rules.
*   **Tagging:** Organize rules using tags for easy searching and filtering.
*   **Quick Insertion:** Quickly insert selected rules into the active VS Code editor.
*   **Add New Rules:** Add new rules to your library via a form.
*   **Add New Tags:** Manage your tags for better rule organization.

## Installation

1.  Install Raycast from [raycast.com](https://www.raycast.com/).
2.  Open the Raycast app.
3.  Search for "Roo Code Rule Library" in the Raycast Store and install the extension.

Alternatively, if you have the source code:

1.  Clone the repository to your local machine.
2.  Navigate to the extension directory in your terminal.
3.  Run `npm install` to install dependencies.
4.  Run `npm run dev` to link the extension to Raycast for development.

## Usage

1.  Open the Raycast app.
2.  Search for "Roo Code Rule Library".
3.  Use the available commands to:
    *   View your rule library.
    *   Add new rules.
    *   Add new tags.
    *   Apply rules to your active VS Code project folder.


### Extension Preferences

The extension provides the following preferences:

*   **Preferred VS Code Editor** (`preferredEditor`)
    *   Select the VS Code editor build you use.
    *   **Default:** Visual Studio Code

*   **Roo Code Custom Modes File** (`customModesPath`)
    *   Path to the Roo Code custom_modes.json file. Use '~' for the home directory.
    *   **Default:** `~/Library/Application Support/Code/User/globalStorage/rooveterinaryinc.roo-cline/settings/custom_modes.json`

*   **Storage Directory** (`storageDirectory`)
    Path to the directory where rules.json and tags.json will be stored. Use '~' for the home directory.
    *   **Default:** `~/Documents/RooCodeRuleLibrary`


## Contributing

If you'd like to contribute to this project, please feel free to submit a pull request or open an issue on the GitHub repository.

## License

This project is licensed under the MIT License.