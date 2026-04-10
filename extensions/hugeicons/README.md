# Hugeicons

Search, preview, bookmark, and retrieve icons from [Hugeicons](https://hugeicons.com) directly in Raycast.

## Features

- **Search Icons** — Search Hugeicons by name, tag, or category with relevance-sorted results
- **Download** — Save icons as SVG files, or as PNG on macOS
- **Copy Formats** — Copy as SVG, JSX (React), Vue SFC, or Svelte components
- **Bookmarks** — Organize your favorite icons into custom folders
- **Preview Style Switching** — Change the result preview style from the search bar and inspect all available styles per icon
- **Fast Revisit Flow** — Cached previews, recent searches, and infinite scrolling keep common lookups fast
- **Customization** — Choose icon colors, grid sizes, and the default primary action for search results
- **AI Extension** — Mention `@Hugeicons` in Raycast AI to search by natural language, inspect styles, or request code

## Setup

This extension requires a Hugeicons API key (Universal License Key).

### Getting Your API Key

1. Go to [hugeicons.com](https://hugeicons.com) and sign in to your account
2. Navigate to Profile > License
3. Copy your Universal License Key
4. Open Raycast, search for "Hugeicons", and paste your API key in the preferences

## Commands

| Command | Description |
|---------|-------------|
| Search Icons | Search and browse the entire Hugeicons library |
| View Bookmarks | Access your saved icons organized by folders |
| Manage Preferences | Configure grid size, default colors, and other settings |
| Create Bookmark Folder | Create a new folder for organizing bookmarked icons |

## AI Extension

If you use Raycast AI, you can mention `@Hugeicons` to:

- Search by intent or natural language, such as `@Hugeicons find a clean star icon for ratings`
- Inspect a specific icon and see which styles it supports
- Request SVG, React JSX, Vue, or Svelte icon code for an exact Hugeicons icon name

## Preferences

| Preference | Description | Default |
|------------|-------------|---------|
| API Key | Your Hugeicons Universal License Token | Required |
| Grid Size | Number of columns in the icon grid (Large/Medium/Small) | Medium |
| Default Icon Color | Default color applied to icons | Auto (adapts to theme) |
| Primary Search Action | What pressing Enter does in Search Icons | View All Styles |

## Actions

- **Copy SVG** — Copy the icon as raw SVG
- **Paste SVG** — Paste SVG directly into the frontmost app
- **Copy as React (JSX)** — Copy as a React component
- **Copy as Vue (SFC)** — Copy as a Vue single-file component
- **Copy as Svelte** — Copy as a Svelte component
- **Download SVG** — Save the icon to your Downloads folder
- **Download or Copy PNG** — Available on macOS
- **Copy Icon Name** — Copy the current Hugeicons icon name
- **Open on Hugeicons** — Open the icon page in your browser
- **Add to Folder** — Bookmark the icon to a custom folder
- **Bulk Add Visible or Selected Results** — Save multiple search results into a folder at once
