# forScore

Manage forScore from Raycast

## Features

- **Next Page**: Navigate to the next page in forScore
- **Previous Page**: Navigate to the previous page in forScore

## Requirements

- forScore must be installed on your Mac
- Bundle ID: `com.mgsdevelopment.forscore`

## Setup

### Disable Half-Page Turns in forScore

For direct page navigation without intermediate scrolling:

1. Open forScore
2. Double-tap the center of the page or tap the grid icon in the title bar
3. In the Display Options overlay, tap the "Half-Page Turns" button to disable it
   - The background should become dark when disabled
   - This ensures `Next Page` and `Previous Page` commands jump directly to pages without scrolling through half-page increments

## Commands

### Page Navigation

- `Next Page` - Navigate to the next page (`forscore://action?type=nextpage`)
- `Previous Page` - Navigate to the previous page (`forscore://action?type=prevpage`)
- `Go to Page` - Jump to a specific page number with an argument (`forscore://open?page={number}`)

### Setlist Navigation

- `Next Score in Setlist` - Navigate to the next score in the setlist (`forscore://action?type=nextitem`)
- `Previous Score in Setlist` - Navigate to the previous score in the setlist (`forscore://action?type=previtem`)

### Library Management

- `Browse Scores` - Browse and search your entire forScore library

## Setup Library Browsing

To browse your forScore library in Raycast:

1. **Export metadata from forScore:**
   - Open forScore
   - Tap Værktøj (Tools) → Backup → Scroll icon (top left)
   - Choose "Export CSV"
   - Save the file anywhere (Downloads, Desktop, etc.)

2. **Configure in Raycast:**
   - Search for "Browse Scores" in Raycast
   - Press `Cmd+,` to open Extension Preferences
   - Select the exported CSV file in "CSV Backup File" field
   - Close preferences

3. **Browse your scores:**
   - Search for "Browse Scores" in Raycast
   - Search through all your scores
   - Press Enter to open a score in forScore

**Note:** Re-export the CSV from forScore whenever you add new scores. Raycast will automatically pick up the changes if you save to the same file path.
