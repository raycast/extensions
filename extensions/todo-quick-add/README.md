# To-Do Quick Add - Raycast Extension

A Raycast extension that provides quick task capture for your To-Do app with smart parsing capabilities.

## Features

- 🚀 **Quick capture** - Add tasks from anywhere with Raycast
- 🏷️ **Smart tag parsing** - Use `#tag` syntax to automatically tag tasks
- 🚩 **Priority detection** - Use `@high`, `@medium`, `@low` or natural language like "urgent"
- 📅 **Flexible dates** - Parse dates like `/tomorrow`, `/friday`, `/11/14`, or natural phrases
- 🤖 **Natural language** - Understands "urgent task by tomorrow" and cleans up filler words
- 🔄 **Real-time sync** - Tasks appear instantly in your iOS/macOS app via Firebase

## Installation

1. **Clone or download** this extension from the raycast-extension directory
2. **Install dependencies**:
   ```bash
   cd raycast-extension
   npm install
   ```
3. **Build the extension**:
   ```bash
   npm run build
   ```
4. **Import into Raycast**:
   - Open Raycast
   - Go to Extensions
   - Click "Add Extension" → "Import Extension"
   - Select the `raycast-extension` folder

## Configuration

The extension automatically reads Firebase credentials from your iOS app's `GoogleService-Info.plist`!

**No manual configuration needed** - it just works! 🎉

If the plist file isn't found (e.g., you moved the extension), you can manually configure it in `src/config.ts`.

## Authentication Setup

### Quick Setup (Recommended)

The extension automatically reads Firebase config from your iOS app - no manual config needed!

**To authenticate:**

1. **Create an email/password account** in [Firebase Console](https://console.firebase.google.com/):
   - Go to Authentication → Users → Add User
   - Enter an email and password
   - Save it!

2. **Configure Raycast**:
   - Open Raycast → Find "Add Task"
   - Go to preferences (Cmd+K → Configure)
   - Enter your email and password
   - Done!

That's it! The extension uses the same Firebase project as your iOS app.

### Sharing Data with iOS App

If you want to share tasks between Raycast and your iOS app (same user):

**Option A: Link Email to Existing User**
1. In Firebase Console → Authentication
2. Click on your Apple Sign In user  
3. Add a new sign-in method: Email/Password
4. Set email and password
5. Use these credentials in Raycast

**Option B: Migrate Tasks**
- Export tasks from one account and import to the other
- Or manually recreate them

### Advanced: Custom Token

For power users who want automatic authentication without email/password, see `CUSTOM_TOKEN_GENERATION.md`.

⚠️ This requires downloading Firebase service account keys and running scripts - not recommended for most users!

## Usage

### Basic Task
```
Buy milk
```

### With Tags
```
Buy milk #groceries
Team meeting #work #urgent
```

### With Priority
```
Fix bug @high
Review PR @medium
Clean desk @low
```

### With Due Dates
```
Submit invoice /tomorrow
Team standup /monday
Doctor appointment /11/20
Meeting /friday 3pm
```

### Combined (Power User Mode!)
```
Buy milk #groceries @high /tomorrow
Team standup #work @medium /monday 9am
Fix login bug #urgent @high /today
```

### Natural Language
The extension understands natural language and will automatically:
- Detect priority from words like "urgent", "asap", "critical"
- Parse dates from phrases like "by tomorrow", "this friday"
- Remove filler words like "I need to", "we gotta", "don't forget to"

Examples:
```
I need to call the dentist tomorrow
→ Creates: "Call the dentist" (due tomorrow)

urgent: fix the login bug by friday
→ Creates: "Fix the login bug" (high priority, due Friday)

we gotta sand the roof by tuesday and its high priority
→ Creates: "Sand the roof" (high priority, due Tuesday)
```

## Syntax Reference

| Prefix | Purpose | Examples |
|--------|---------|----------|
| `#` | Tags | `#work` `#urgent` `#personal` |
| `@` | Priority | `@high` `@medium` `@low` `@h` `@m` `@l` |
| `/` | Due Date | `/tomorrow` `/friday` `/11/14` `/next week` |

## Development

### Setup
```bash
npm install
```

### Run in development mode
```bash
npm run dev
```

### Lint
```bash
npm run lint
```

### Build
```bash
npm run build
```

## How It Works

This extension:
1. Connects to the same Firebase Firestore as your iOS/macOS app
2. Authenticates with your Firebase credentials
3. Fetches your existing tags for smart matching
4. Parses task text using the same logic as the native app
5. Creates tasks that instantly sync across all devices

## Comparison with Native Quick Add

Both interfaces work simultaneously and identically:

| Feature | Raycast Extension | Native Quick Add |
|---------|------------------|------------------|
| Smart parsing | ✅ | ✅ |
| Tag matching | ✅ | ✅ |
| Priority detection | ✅ | ✅ |
| Date parsing | ✅ | ✅ |
| Natural language | ✅ | ✅ |
| Firebase sync | ✅ | ✅ |
| Activation | Raycast hotkey | App hotkey (Cmd+Shift+A) |

**Choose whichever fits your workflow better!**

## Troubleshooting

### "Not authenticated" error
- Check that your Firebase credentials are correct in preferences
- Make sure your user email and password match your Firebase Auth account
- Try re-entering your credentials

### Tasks not appearing in app
- Verify you're using the same Firebase project
- Check that you're logged in with the same account in both places
- Check your internet connection (both require network access)

### "Failed to initialize" error
- Verify all Firebase config values are correct
- Check that Firestore is enabled in your Firebase console
- Make sure your Firebase project allows authentication

## Support

For issues or questions:
- Check the main app documentation in `/to-do/README.md`
- Review Firebase setup guides in the root directory
- Ensure your Firebase security rules allow the extension to write

## License

MIT

