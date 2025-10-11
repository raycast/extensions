# Quick Setup Instructions

## ⚠️ Important: Fix npm Permissions First

You have an npm permission issue that needs to be resolved before installation. Run this command:

```bash
sudo chown -R $(whoami) "/Users/$(whoami)/.npm"
```

## Installation Steps

1. **Navigate to the project directory:**
   ```bash
   cd /Users/tpanos/Desktop/Builds/raycast-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start development mode:**
   ```bash
   npm run dev
   ```

4. **Test in Raycast:**
   - Open Raycast (⌘Space)
   - Type "Search AI Prompts"
   - Press Enter to open the extension

## What's Been Built

### ✅ Complete Extension Structure
- **Main Component** (`src/index.tsx`): Full-featured search interface with List view
- **Type Definitions** (`src/types/index.ts`): Categories, interfaces, labels, and icons
- **CSV Parser** (`src/utils/loadPrompts.ts`): Robust parser for the 14,000+ prompts
- **Auto-Categorization** (`src/utils/categorize.ts`): Smart keyword-based categorization
- **Icon** (`assets/command-icon.png`): Custom prompt library icon

### 🎯 Features Implemented

1. **Search & Filter**
   - Real-time search through all prompts
   - Filter by categories using dropdown
   - Grouped display by category

2. **Categories**
   - Development (💻)
   - Marketing (📈)
   - Writing (✍️)
   - Research (🔬)
   - Design (🎨)
   - Business (💼)
   - General (📋)

3. **Actions**
   - **Paste to Active App**: Primary action - pastes prompt into current app
   - **Copy to Clipboard**: Fallback - copies prompt text
   - **View Full Prompt**: See complete prompt text

4. **UI Features**
   - Color-coded categories
   - Preview text (first 100 chars)
   - Empty state handling
   - Loading states
   - Toast notifications

## File Structure

```
raycast-extension/
├── package.json              # Raycast extension config
├── tsconfig.json            # TypeScript configuration
├── README.md                # Full documentation
├── SETUP_INSTRUCTIONS.md    # This file
├── .gitignore              # Git ignore rules
├── prompt_library.csv      # Your 14,000+ prompts
├── assets/
│   └── command-icon.png    # Extension icon
└── src/
    ├── index.tsx           # Main List component
    ├── types/
    │   └── index.ts        # TypeScript types & enums
    └── utils/
        ├── loadPrompts.ts  # CSV parser
        └── categorize.ts   # Auto-categorization

```

## How to Use

1. **Search**: Type to search prompt names or content
2. **Filter**: Use dropdown to filter by category
3. **Select**: Navigate with arrow keys
4. **Paste**: Press ⌘↩ to paste into active app
5. **Copy**: Press ⌘⇧C to copy to clipboard
6. **View**: Press ⌘P to see full prompt

## Next Steps

After running `npm install` and `npm run dev`:

1. The extension will hot-reload in Raycast
2. Search for "Search AI Prompts" in Raycast
3. Test the search, filter, copy, and paste features
4. When satisfied, run `npm run build` for production

## Troubleshooting

**If prompts don't load:**
- Check that `prompt_library.csv` exists in the root
- Check terminal for error messages

**If paste doesn't work:**
- Some apps block programmatic pasting
- The extension will auto-fallback to copy
- You can then manually paste with ⌘V

**If extension doesn't appear:**
- Make sure `npm run dev` is still running
- Try restarting Raycast (⌘Q then reopen)

## Support

For Raycast extension development help:
- Docs: https://developers.raycast.com/
- Examples: https://github.com/raycast/extensions
