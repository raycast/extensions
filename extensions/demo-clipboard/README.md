# Demo Clipboard - Raycast Extension

Queue clipboard items and paste them sequentially during software demos.

## Overview

Demo Clipboard is a Raycast extension that allows you to prepare a queue of text items in advance and paste them sequentially with a hotkey during presentations or software demos. Items persist in the queue until you manually change or clear them, allowing you to reuse the same demo script multiple times.

## Features

- **Persistent Queue**: Items stay in the queue after pasting - just tracks your position
- **Sequential Pasting**: Paste items one by one with a hotkey, automatically advancing position
- **Form-Based Management**: Edit all items in a single form interface
- **Dynamic Fields**: Start with 5 fields, add up to 50 as needed
- **Position Tracking**: See what's next and which items have been pasted
- **Reset to Top**: Restart from the beginning without re-entering items
- **Visual Indicators**: Clear labels show which item is next and which have been pasted

## Installation

The extension is currently in development mode. To use it:

1. Open Raycast
2. The extension should appear automatically in development mode
3. Search for "Demo Clipboard" commands

## Commands

### 1. Manage Demo Queue
A form interface where you manage all your demo items.

**Features:**
- Edit all items in text area fields
- Add new fields (up to 50 items)
- Remove fields you don't need
- See current position and what's next
- Save changes with Cmd+S
- Reset position to top with Cmd+R
- Clear all items with Cmd+Shift+Delete

**Visual Indicators:**
- "Item 1 → NEXT" - Shows which item will be pasted next
- "Item 2 (pasted)" - Shows items already pasted
- "Item 3" - Regular items not yet reached

**Keyboard Shortcuts:**
- `Cmd + S` - Save queue
- `Cmd + N` - Add new field
- `Cmd + R` - Reset to top of queue
- `Cmd + Shift + Delete` - Clear all items

### 2. Paste Next Demo Item
Pastes the current item and advances the position (without removing the item).

**To set up a global hotkey:**
1. Open Raycast Settings (Cmd + ,)
2. Go to Extensions → Demo Clipboard
3. Find "Paste Next Demo Item"
4. Click to record a hotkey (e.g., `Cmd + Shift + V`)

**Behavior:**
- Pastes the item at current position
- Advances to next item
- Shows HUD notification with position (e.g., "✓ Pasted item 2/5 • 3 remaining")
- Items remain in queue for reuse

## Usage Workflow

### Initial Setup

1. **Open "Manage Demo Queue":**
   - Form opens with 5 empty text fields
   - Fill in the text you'll need to paste during your demo
   - Click "Add Field" (Cmd+N) if you need more than 5 items

2. **Save your queue:**
   - Press Cmd+S to save
   - Items are now ready for pasting

3. **Set up global hotkey:**
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
- Press Cmd+R to reset to top
- Run your demo again with the same items

**Option B: Edit and Update**
- Open "Manage Demo Queue"
- Modify items as needed
- Save with Cmd+S
- Reset position if desired

## Example Use Case

**Demo Scenario: User Registration Flow**

### Setup:
1. Open "Manage Demo Queue"
2. Fill in fields:
   - Item 1: `demo@example.com`
   - Item 2: `SecurePassword123!`
   - Item 3: `Acme Corporation`
   - Item 4: `San Francisco, CA`
   - Item 5: `https://acme.com`
3. Save (Cmd+S)

### During Demo:
1. Navigate to registration form
2. Email field → Press hotkey → `demo@example.com` pasted
3. Password field → Press hotkey → `SecurePassword123!` pasted
4. Company field → Press hotkey → `Acme Corporation` pasted
5. Continue for remaining fields

### Running Multiple Demos:
- After first demo, press Cmd+R to reset
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
│   ├── manage-queue.tsx              # Form-based queue management UI
│   ├── paste-next.tsx                # Paste and advance command
│   ├── components/                   # (Removed - no longer needed)
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

1. **Add More Fields**: Don't limit yourself to 5 - add as many as you need up to 50
2. **Leave Blanks**: Empty fields are fine - they'll be skipped
3. **Multi-line Text**: Text areas support multi-line content
4. **Quick Reset**: After a demo, Cmd+R gets you back to the start instantly
5. **Edit Anytime**: Modify items between demos without losing your place

## License

MIT
