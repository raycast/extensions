# Fetch YouTube Transcript 📄🎥

[![Raycast Extension](https://img.shields.io/badge/Raycast-Extension-blue)](https://www.raycast.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Powered-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

## 📝 Description

Fetch YouTube Transcript is a Raycast extension that allows users to easily fetch and save the transcript of a YouTube video. This tool enhances productivity by providing quick access to video content in text format.

## ✨ Features

- 🔍 Fetches transcripts from YouTube videos
- 💾 Saves transcripts to a specified folder
- 🚀 Integrates seamlessly with Raycast

## 🛠 Installation

This extension is built for Raycast. To use it:

1. Install Raycast if you haven't already
2. Open Raycast and search for "Fetch YouTube Transcript"
3. Install the extension

## 🖥 Usage

1. Open Raycast
2. Type "Fetch YouTube Transcript"
3. Enter the YouTube video URL when prompted
4. Choose where to save the transcript (uses default Download folder if not specified)

## ⚙️ Configuration

You can set a default download folder in the extension preferences:

1. Open Raycast
2. Go to Extensions
3. Find "Fetch YouTube Transcript"
4. Set the "Default Download Folder" preference

## 📂 Project Structure

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

## 🧰 Technical Details

### 📦 Dependencies
- `@raycast/api`: ^1.82.5 - Core Raycast API for extension development
- `ytdl-core`: ^4.11.5 - YouTube downloading library
- `node-fetch`: ^3.3.2 - Fetch API for Node.js

### 🔧 Dev Dependencies
- TypeScript, ESLint, Prettier configurations for robust development

### 📜 Available Scripts
- `build`: Builds the extension for distribution
- `dev`: Starts the development server
- `lint`: Runs code quality checks

## 🚨 Troubleshooting

### GitHub Actions Build Issues

If you encounter npm errors during GitHub Actions builds (particularly with `@types/ytdl-core`), follow these steps:

1. **Package Resolution Error**
   If you see an error like `npm error 404 Not Found - GET https://registry.npmjs.org/@types%2Fytdl-core`, try:
   - Clear npm cache in your GitHub Actions workflow:
     ```yaml
     - name: Clear npm cache
       run: npm cache clean --force
     ```
   - Ensure your workflow has proper registry access:
     ```yaml
     - name: Setup Node.js
       uses: actions/setup-node@v3
       with:
         node-version: '20'
         registry-url: 'https://registry.npmjs.org'
     ```

2. **Dependencies Installation**
   - Run npm install with legacy peer deps:
     ```yaml
     - name: Install Dependencies
       run: npm install --legacy-peer-deps
     ```

3. **Package Lock Issues**
   - If issues persist, try removing package-lock.json and running a fresh install:
     ```yaml
     - name: Clean Install
       run: |
         rm -f package-lock.json
         npm install
     ```

## 🌱 What We Learned

Through developing this extension, we gained insights into:
1. Raycast extension development
2. Working with YouTube data and transcripts
3. TypeScript configuration
4. Managing project dependencies
5. Implementing user preferences

## 🤝 Contributing

Contributions are welcome! Please submit a Pull Request or open an Issue.

## 📄 License

MIT License - Free for personal and commercial use.

## 👤 Contact

- **Author**: Apoorv Khandelwal
- **GitHub**: [Your GitHub Profile]
- **Email**: [Your Professional Email]

## 🙏 Acknowledgements

- Raycast for an excellent extension platform
- ytdl-core library for YouTube data extraction
