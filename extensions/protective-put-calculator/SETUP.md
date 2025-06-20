# Setup Instructions for Protective Put Calculator

## Quick Start

1. **Install Dependencies**
   ```bash
   cd /Users/kshum/Documents/gitproj/dotfiles/raycast/extensions/hold-overnight
   npm install
   ```

2. **Create Icon** (Required)
   - Download a 512x512 PNG icon and save as `assets/command-icon.png`
   - Suggested sources:
     - [Heroicons](https://heroicons.com) (search "shield")
     - [Feather Icons](https://feathericons.com) (search "shield")
     - [Flaticon](https://www.flaticon.com) (search "protection")

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Open Raycast**
   - The extension should appear in Raycast
   - Search for "Calculate Protective Put"

## Manual Icon Creation

If you can't download an icon, create a simple one:

1. Open any image editor (Preview, GIMP, Photoshop)
2. Create a 512x512 pixel image
3. Add a shield or protection symbol
4. Save as `assets/command-icon.png`

Or use emoji:
1. Open TextEdit
2. Type 🛡️ (shield emoji)
3. Take a screenshot
4. Crop to square and resize to 512x512
5. Save as `assets/command-icon.png`

## Test the Extension

1. Open Raycast (⌘ + Space)
2. Type "Calculate Protective Put"
3. Enter test data:
   - Ticker: AAPL
   - Stop Loss: 170
   - Max Loss: 500
   - Holding Period: 1 week
4. View results

## Troubleshooting

**Extension doesn't appear in Raycast:**
- Make sure you ran `npm run dev`
- Check that `assets/command-icon.png` exists
- Restart Raycast

**API errors:**
- The extension uses Yahoo Finance (free, no API key needed)
- Check internet connection
- Try a different ticker symbol

**Build errors:**
- Run `npm run lint` to check for issues
- Ensure all dependencies are installed

## Production Setup

For real trading use:

1. **Get options data API key:**
   - Sign up for [Alpha Vantage](https://www.alphavantage.co/support/#api-key) (free tier available)
   - Replace mock option pricing with real data

2. **Add API key storage:**
   - Use Raycast's preferences system
   - Store API keys securely

3. **Enhanced validation:**
   - Add more input validation
   - Better error handling

## File Structure

```
protective-put-calculator/
├── assets/
│   └── command-icon.png        # Required icon file
├── src/
│   ├── api.ts                  # Yahoo Finance integration
│   ├── calculator.ts           # Core calculation logic
│   ├── calculate-protective-put.tsx  # Main Raycast component
│   └── types.ts               # TypeScript interfaces
├── package.json               # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
└── README.md                 # Documentation
```

## Next Steps

1. Create the icon file
2. Run `npm install`
3. Run `npm run dev`
4. Test with your first calculation!

The extension is ready to use for educational purposes. For live trading, consider upgrading to real options data APIs.
