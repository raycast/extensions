# Fetch YouTube Transcript

## Description
Fetch YouTube Transcript is a Raycast extension that allows users to easily fetch and save the transcript of a YouTube video. This tool enhances productivity by providing quick access to video content in text format.

## Features
- Fetches transcripts from YouTube videos
- Saves transcripts to a specified folder
- Integrates seamlessly with Raycast

## Installation
This extension is built for Raycast. To use it:
1. Install Raycast if you haven't already
2. Open Raycast and search for "Fetch YouTube Transcript"
3. Install the extension

## Usage
1. Open Raycast
2. Type "Fetch YouTube Transcript"
3. Enter the YouTube video URL when prompted
4. Choose where to save the transcript (uses default Download folder if not specified)

## Configuration
You can set a default download folder in the extension preferences:
1. Open Raycast
2. Go to Extensions
3. Find "Fetch YouTube Transcript"
4. Set the "Default Download Folder" preference

## Project Structure
The project follows a standard Raycast extension structure:

```
fetch-youtube-transcript/
│
├── assets/
│   └── extension_icon.png
│
├── src/
│   └── fetch-youtube-transcript.tsx
│
├── .eslintrc.json
├── .gitignore
├── .prettierrc
├── CHANGELOG.md
├── package.json
├── package-lock.json
├── README.md
└── tsconfig.json
```

- `assets/`: Contains the extension icon.
- `src/`: Contains the main source code file for the extension.
- `.eslintrc.json`: ESLint configuration for code linting.
- `.gitignore`: Specifies intentionally untracked files to ignore.
- `.prettierrc`: Prettier configuration for code formatting.
- `CHANGELOG.md`: Documents notable changes for each version of the project.
- `package.json`: Defines the project dependencies and scripts.
- `package-lock.json`: Locks the versions of installed packages.
- `README.md`: Provides information about the project (this file).
- `tsconfig.json`: TypeScript compiler configuration.

## Technical Details

### Dependencies
- @raycast/api: ^1.82.5 - Core Raycast API for extension development
- ytdl-core: ^4.11.5 - YouTube downloading library
- node-fetch: ^3.3.2 - Fetch API for Node.js

### Dev Dependencies
- @raycast/eslint-config: ^1.0.8
- @types/node: 20.8.10
- @types/react: 18.3.3
- @types/ytdl-core: ^4.11.4
- eslint: ^8.57.0
- prettier: ^3.3.3
- typescript: ^5.4.5

### Scripts
- `build`: Builds the extension for distribution
- `dev`: Starts the development server
- `fix-lint`: Automatically fixes linting issues
- `lint`: Runs the linter
- `publish`: Publishes the extension to Raycast

### TypeScript Configuration
- Target: ES2022
- Module: ES2022
- Strict mode enabled
- React JSX support
- Output directory: dist

## What We Learned
Through the development of this extension, we gained insights into:
1. Raycast extension development and its API usage
2. Working with YouTube data and transcripts
3. TypeScript configuration for Raycast extensions
4. Managing dependencies and scripts for a Raycast project
5. Implementing user preferences in Raycast extensions
6. Structuring a Raycast extension project for maintainability and clarity

## Contributing
Contributions are welcome! Please feel free to submit a Pull Request.

## License
This project is licensed under the MIT License.

## Author
Created by apoorv_khandelwal

## Acknowledgements
- Raycast for providing an excellent platform for extensions
- The ytdl-core library for YouTube data extraction capabilities