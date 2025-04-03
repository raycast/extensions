# Rename.ai - Raycast Extension

A Raycast extension that uses AI to automatically rename image files based on their content.

## Features

- Renames image files using Google's Gemini AI to analyze their content
- Works directly with selected files in Finder
- Maintains original file extensions
- Handles duplicate filenames automatically
- Supports various image formats (.jpg, .jpeg, .png, .gif, .bmp, .webp, .tiff, .heic)

## Setup

1. Install the extension from the Raycast Store
2. Obtain a Google API key with access to the Gemini API:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create a new API key or use an existing one
3. Configure the extension:
   - Open Raycast and go to Extensions > rename.ai > Settings
   - Add your Google API key to the `GOOGLE_GENERATIVE_AI_API_KEY` preference field

## Usage

1. Select one or more image files in Finder
2. Launch Raycast and run the "rename" command from rename.ai
3. The extension will analyze each image using AI and rename it based on its content
4. A toast notification will show the results of the renaming operation
5. The renamed files will be shown in Finder

## How It Works

1. The extension uses Vercel AI SDK to connect with Google's Gemini 2.0 Flash model
2. The image is analyzed to understand its content
3. The AI suggests a concise, descriptive filename in kebab-case format
4. The file is renamed while preserving its original extension

## Troubleshooting

- **Extension fails to run**: Make sure you have entered your Google API key in the extension settings
- **API errors**: Ensure your Google API key has access to the Gemini model and hasn't expired
- **Renaming failures**: Check if you have write permissions to the directory where the image is located

## Privacy

- Your images are processed using Google's Gemini API
- The extension does not store your images or analysis results anywhere
- Your API key is stored securely in Raycast's preference system

## Requirements

- Raycast v1.50.0 or higher
- macOS 11 or higher
- Internet connection for AI analysis

## Development

If you want to modify or contribute to this extension:

1. Clone the repository
2. Install dependencies: `npm install`
3. Run the development server: `npm run dev`

## License

MIT