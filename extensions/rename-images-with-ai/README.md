# Rename Images with AI

![Rename Images with AI](assets/extension-icon.png)

AI-powered images and screenshots renaming extension that uses Google Gemini's vision to intelligently rename images based on their content.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/raycast/extensions/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/raycast/extensions/pulls)

## Features

- **AI-Powered Naming**: Uses Google Gemini to analyze your screenshots or images and create descriptive, meaningful filenames
- **Cost-Effective**: Gemini offers a great balance of performance and cost, with generous free quotas for personal use
- **Batch Processing**: Select multiple screenshots or images at once to rename them all in one go
- **Finder Integration**: Directly rename multiple images selected in Finder
- **User-Friendly UI**: Simple interface with clear feedback on the renaming process
- **Adjustable Batch Size**: Control how many images are processed simultaneously

## Getting Started

The extension requires a Google Gemini API key to analyze your screenshots:

1. Get a Google Gemini API key:

   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create an API key (free to start)
   - Copy your API key

2. Open Raycast and go to the extension settings for "Rename Images with AI"

   - Enter your Google Gemini API key

3. Optional: Adjust batch size to control how many images are processed at once

## How It Works

The extension uses Google Gemini's vision capabilities to analyze the content of each screenshot and generate a descriptive filename. For example:

- A screenshot of a chart might be renamed to `sales_chart.png`
- A screenshot of a login page might be renamed to `login_page_ui.png`

This makes it much easier to search for specific screenshots later, as the filenames actually describe the content.

Gemini 1.5 Flash offers excellent image understanding at a low cost, and most new Google AI accounts start with a free quota.

## Usage

### Method 1: Interactive UI Method

1. Open Raycast and search for "Rename Images"
2. Click "Select Images" to choose the image files you want to rename
3. Click "Rename Images" to start the AI analysis and renaming process
4. Review the results in the list view

### Method 2: Instant Rename (Recommended)

1. Select images or screenshots in Finder
2. Open Raycast and search for "rename" (or "Rename Selected Images")
3. Press Enter - images will be renamed instantly without additional steps
4. A toast notification will confirm when renaming is complete

The Instant Rename method is perfect for quickly renaming images with a single command while you continue working.

## Examples

Before:

- `Screenshot 2023-11-15 at 10.32.45.png`
- `Screenshot 2023-11-16 at 15.20.33.png`

After:

- `sales_dashboard_chart.png`
- `login_page_ui.png`

## Requirements

- Raycast v1.50.0 or higher
- Node.js v16 or higher
- Google Gemini API key (required)

## Troubleshooting

### API Key Issues

- Make sure you've created an API key in Google AI Studio and have accepted the terms of service
- Verify that you've entered the API key correctly in the extension preferences

### Rate Limits & Quota Issues

If you encounter rate limit errors:

1. Check your [Google AI Studio quota](https://makersuite.google.com/app/apikey)
2. Most new accounts start with a free quota that's generous for personal use
3. You may need to set up billing if you're processing large batches of images

### General Troubleshooting

- **Processing Large Batches**: Try renaming in smaller batches by reducing the batch size in preferences
- **File Permission Issues**: Make sure Raycast has permission to access and modify the files or images
- **File Selection Issues**: If images aren't being detected, make sure you've selected them in Finder first

## License

MIT
