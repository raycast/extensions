# Demo Clipboard - Raycast Extension

Queue clipboard items and paste them sequentially during software demos.

## Overview

Demo Clipboard is a Raycast extension that allows you to prepare a queue of text items in advance and paste them sequentially with a hotkey during presentations or software demos. Items persist in the queue until you manually change or clear them, allowing you to reuse the same demo script multiple times.

## Features

- **Persistent Queue**: Items stay in the queue after pasting - just tracks your position
- **Sequential Pasting**: Paste items one by one with a hotkey, automatically advancing position
- **List-Based Management**: View and manage all items in a searchable list interface
- **Instant Saves**: Every edit, reorder, and add is saved automatically
- **Position Tracking**: See what's next and which items have been pasted
- **Reset to Top**: Restart from the beginning without re-entering items
- **Visual Indicators**: Icons and tags show which item is next and which have been pasted

## Installation

The extension is currently in development mode. To use it:

1. Open Raycast
2. The extension should appear automatically in development mode
3. Search for "Demo Clipboard" commands

## Commands

### 1. Manage Demo Queue

A searchable list interface where you manage all your demo items. Changes are saved automatically.

**Actions (via action panel):**
- Edit item text in a dedicated form
- Set any item as the next to paste
- Add a new item above or below the selected item (pre-filled with clipboard contents)
- Remove an item
- Move items up or down to reorder
- Reset position to top
- Clear all items

**Keyboard Shortcuts:**
- `Cmd + E` - Set selected item as next
- `Cmd + N` - Add new item above selected
- `Cmd + Shift + N` - Add new item below selected
- `Cmd + D` - Remove selected item
- `Cmd + Shift + ↑` - Move selected item up
- `Cmd + Shift + ↓` - Move selected item down
- `Cmd + R` - Reset to top of queue
- `Cmd + Shift + Delete` - Clear all items

**Visual Indicators:**
- Green arrow icon + `NEXT` tag - The item that will be pasted next
- Checkmark icon + `pasted` tag - Items already pasted
- Circle icon - Items not yet reached

### 2. Paste Next Demo Item

Pastes the current item and advances the position (without removing the item). Empty items are skipped automatically.

**To set up a global hotkey:**
1. Open Raycast Settings (Cmd + ,)
2. Go to Extensions → Demo Clipboard
3. Find "Paste Next Demo Item"
4. Click to record a hotkey (e.g., `Cmd + Shift + V`)

**Behavior:**
- Pastes the item at current position
- Skips empty items and advances past them
- Advances to next item after pasting
- Shows HUD notification with position (e.g., "✓ Pasted item 2/5 • 3 remaining")
- Items remain in queue for reuse

## Usage Workflow

### Initial Setup

1. **Open "Manage Demo Queue":**
   - List opens with one empty item ready to edit
   - Press Enter on it to open the edit form and fill in your first item
   - Use `Cmd + Shift + N` to add more items below as needed

2. **Set up global hotkey:**
   - Go to Raycast Settings
   - Configure "Paste Next Demo Item" with your preferred hotkey

### During Your Demo

1. **Navigate to first field** in your demo application
2. **Press your hotkey** → First item is pasted
3. **Move to next field** in your application
4. **Press hotkey again** → Second item is pasted
5. **Continue** through all items

### After Your Demo

The queue persists with your items! You have two options:

**Option A: Reset and Reuse**
- Open "Manage Demo Queue"
- Press `Cmd + R` to reset to top
- Run your demo again with the same items

**Option B: Edit and Update**
- Open "Manage Demo Queue"
- Select an item and press Enter to edit it
- Changes save automatically
- Use `Cmd + R` to reset position if desired

## Example Use Case

**Demo Scenario: User Registration Flow**

### Setup:
1. Open "Manage Demo Queue"
2. Add and edit items:
   - Item 1: `demo@example.com`
   - Item 2: `SecurePassword123!`
   - Item 3: `Acme Corporation`
   - Item 4: `San Francisco, CA`
   - Item 5: `https://acme.com`

### During Demo:
1. Navigate to registration form
2. Email field → Press hotkey → `demo@example.com` pasted
3. Password field → Press hotkey → `SecurePassword123!` pasted
4. Company field → Press hotkey → `Acme Corporation` pasted
5. Continue for remaining fields

### Running Multiple Demos:
- After first demo, press `Cmd + R` to reset
- Run demo again with same items
- No need to re-enter anything

## Key Differences from Traditional Clipboard Managers

- **Demo-Focused**: Designed for sequential pasting during presentations
- **Persistent Items**: Items don't disappear after pasting
- **Position Tracking**: Automatically tracks where you are in the sequence
- **Reusable**: Reset and run the same demo multiple times
- **Simple**: Just two commands - manage and paste

## Technical Details

- **Storage**: Uses Raycast LocalStorage API for persistence
- **Data Format**: JSON with version, items array, and current position
- **Language**: TypeScript + React
- **Dependencies**: @raycast/api, @raycast/utils, uuid
- **Max Items**: 50 items per queue

## File Structure

```
demo-clipboard/
├── src/
│   ├── types.ts                      # TypeScript interfaces
│   ├── storage.ts                    # LocalStorage utilities
│   ├── manage-queue.tsx              # List-based queue management UI
│   ├── paste-next.tsx                # Paste and advance command
│   └── utils/
│       └── queue-operations.ts       # Queue manipulation functions
├── package.json
├── tsconfig.json
└── README.md
```

## Development

To run in development mode:
```bash
npm run dev
```

To build:
```bash
npm run build
```

To lint:
```bash
npm run lint
```

## Tips

1. **Add Items Quickly**: Use `Cmd + Shift + N` to add a new item below — it pre-fills with whatever is in your clipboard
2. **Skip Blanks**: Empty items are skipped automatically during pasting
3. **Multi-line Text**: The edit form supports multi-line content
4. **Quick Reset**: After a demo, `Cmd + R` gets you back to the start instantly
5. **Jump Ahead**: Use "Set as Next" (`Cmd + E`) to skip to any item mid-demo

## License

MIT
