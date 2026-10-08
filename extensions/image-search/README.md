# Image Web Search

Searches images using Google Image API

## Setup Instructions

This extension requires a Google Custom Search API key and a Custom Search Engine ID (CX). Follow these steps to set it up:

### 1. Get Google Custom Search API Key

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Custom Search API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Custom Search API" 
   - Click on it and press "Enable"
4. Create an API key:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key
   - (Optional) Restrict the key to only Custom Search API for better security

### 2. Create Custom Search Engine (CX ID)

1. Go to [Google Programmable Search Engine](https://programmablesearchengine.google.com/)
2. Click "Get started" or "Add" to create a new search engine
3. Configure your search engine:
   - **Sites to search**: Enter `*` to search the entire web, or specific sites
   - **Name**: Give your search engine a name (e.g., "Image Search")
   - **Language**: Select your preferred language
4. Click "Create"
5. In the search engine overview page:
   - Click "Customize" tab
   - Under "Image search", turn ON "Enable image search"
   - Under "Search the entire web", turn ON if you want to search all websites
6. Go to the "Overview" tab and copy your **Search engine ID** (this is your CX ID)

### 3. Configure the Extension

1. Install this Raycast extension
2. When you first use it, you'll be prompted to enter:
   - **API Key**: The API key from step 1
   - **CX ID**: The Search engine ID from step 2
3. These will be saved in your Raycast preferences

## Usage

1. Open the extension in Raycast
2. Type your search query in the search bar
3. Browse the image results
4. Use the actions to:
   - Copy image to clipboard
   - Copy image URL
   - Open image in browser

## API Limits

- **Free tier**: 100 searches per day
- **Paid tier**: $5 per 1,000 additional queries (up to 10,000 per day)
- You can monitor usage in the [Google Cloud Console](https://console.cloud.google.com/)

## Troubleshooting

- **"Invalid API key"**: Make sure you've enabled the Custom Search API for your project
- **"Invalid CX"**: Ensure your search engine has image search enabled
- **No results**: Check that your search engine is configured to search the entire web or relevant sites

