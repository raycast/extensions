# Hugeicons UI

Search, preview, bookmark, and retrieve icons from [Hugeicons](https://hugeicons.com) directly in Raycast.

The extension works in two modes:

- Free mode: browse the bundled free Hugeicons catalog with no setup
- Pro mode: add your Hugeicons Universal License Token to unlock the full Pro library and all styles

## Features

- Search Hugeicons by name, tag, or category with relevance-sorted results
- Use the built-in free icon catalog without an API key
- Unlock the full Hugeicons Pro catalog automatically when a license key is present
- Cache search responses and SVG previews for faster repeat lookups
- Revisit recent searches directly from the style dropdown
- Preview icons with configurable colors, grid sizes, and primary actions
- Inspect all available styles grouped by family with duplicate visual variants merged
- Copy icons as SVG, React JSX, Vue SFC, or Svelte components
- Download SVGs or PNGs on macOS, and copy PNGs to the clipboard
- Bookmark icons into folders and manage them from dedicated commands
- Mention `@Hugeicons UI` in Raycast AI to search, inspect styles, or request code

## Setup

This extension does not require a key for free icons.

Add a Hugeicons API key (Universal License Token) only if you want Pro access.

1. Go to [hugeicons.com](https://hugeicons.com) and sign in to your account
2. Navigate to Profile > License
3. Copy your Universal License Key
4. Open Raycast extension settings for Hugeicons UI and paste the key into `Hugeicons API Key`

## Commands

| Command                | Description                                                        |
| ---------------------- | ------------------------------------------------------------------ |
| Browse Hugeicons       | Search and preview icons from Hugeicons                            |
| View Bookmarks         | Browse and manage bookmarked icons                                 |
| Configure Settings     | Configure grid size, colors, primary actions, and bookmark folders |
| Create Bookmark Folder | Create a new bookmark folder                                       |

## Raycast AI

If you use Raycast AI, you can mention `@Hugeicons UI` to:

- Search by intent or natural language, such as `@Hugeicons UI find a clean star icon for ratings`
- Inspect which styles a specific icon supports
- Request SVG, React JSX, Vue, or Svelte icon code for an exact Hugeicons icon name
