# Setup Instructions

## Installation

1. **Install dependencies:**
   ```bash
   cd just-call
   npm install
   ```

2. **Build the extension:**
   ```bash
   npm run build
   ```

3. **Test in development mode:**
   ```bash
   npm run dev
   ```

## Development

- The extension will open in Raycast's development mode
- Type "Call" to find the command
- Grant Contacts permission when prompted
- Search for contacts and press Enter to call

## Publishing

1. Update the `author` field in `package.json` with your Raycast username
2. Run `npm run publish` to submit to the Raycast Store

## Requirements

- Node.js 20 or later
- npm or yarn
- Raycast installed
- macOS 26 (Tahoe) with Phone app
- iPhone with Handoff enabled for calls

## Troubleshooting

If you encounter build errors with `node-mac-contacts`:
1. Make sure you have Xcode Command Line Tools installed:
   ```bash
   xcode-select --install
   ```
2. Rebuild native modules:
   ```bash
   npm rebuild
   ```

## Testing

1. Ensure your iPhone is on the same Apple ID
2. Enable "Calls on Other Devices" in iPhone Settings
3. Test with a contact that has a phone number
4. The Phone app should open and initiate the call