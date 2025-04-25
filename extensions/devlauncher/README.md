# Dev Launcher

This Raycast extension provides two commands to quickly launch projects and files in your preferred IDEs and terminal.

## Features

* **Launch Projects:** Quickly find and open projects in your favorite IDEs.  Supports filtering by project name and searching within a specified directory.
* **Recently Opened:** Keeps a history of recently opened projects and files for easy access.
* **Pinned Items:** Pin frequently used projects and files for quick access.
* **Customizable:** Configure your preferred IDEs, project directory, search depth, file filters, and terminal.

## Installation

1. Install this extension from the Raycast Extensions store.
2. Configure your preferences (see below).

## Usage

### Project Launch
1. Run the "Project Launch" command.
2. Use the search bar to filter projects.
3. Select the project you want to open.
4. Choose your preferred IDE or terminal from the action menu.

## Preferences

The extension uses the following preferences, which can be configured in the Raycast extension settings:

* **`projectsDirectory`**: The root directory to search for projects (semicolon-separated for multiple directories).  Example: `/Users/username/Projects;/Users/username/ArchivedProjects`
* **`ide`**: Your primary IDE application (e.g., IntelliJ IDEA).
* **`ide2`**: A secondary IDE application (optional).
* **`ide3`**: A tertiary IDE application (optional).
* **`recentlyOpenLimit`**: The maximum number of recently opened items to store.
* **`projectContainsFilter`**: A semicolon-separated list of strings to filter packages with certain files (e.g., `package.json;.git;pom.xml;build.gradle`).
* **`searchDepth`**: The maximum search depth (number of subdirectories) when searching for projects.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT