# Metacritic

Search Metacritic aggregate reviews for movies, video games, and TV shows right from Raycast.

## Overview
This Raycast extension lets you quickly search Metacritic's autosuggest API and browse results in a visual grid. Each item displays:

- Media type emoji (e.g., 🎮 for games, 📺 for shows, 🎦 for movies)
- Colored score indicator (🟢/🟡/🔴) and the numeric Metascore when available
- Cover art thumbnail

You can open an item on Metacritic in your browser or copy the title (and score) to your clipboard.

## Features
- Visual grid of results with cover images
- Emoji titles indicating media type and score

## Usage
1. Launch the command in Raycast.
2. Start typing to search for games, movies, or TV shows.
3. Select an item to see actions:
   - Open on Metacritic
   - Copy Title and Score

## Limitations
- This extension uses Metacritic's autosuggest API endpoint (https://backend.metacritic.com/finder/metacritic/search/{query}/web?apiKey=key&limit=30&offset=0). This is the same API that powers Metacritic's own search page. Please note that this API may change over time or might not be accessible in all regions.

## Data Ownership and Responsibility
- This extension is an unofficial client. It is not affiliated with, endorsed, or sponsored by Metacritic.
- All data, scores, images, trademarks, and related content are the property of their respective owners, including Metacritic.
- The author(s) assumes no responsibility or liability for the use of this extension. Use at your own risk.