# Raycast Extension Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd raycast-extension
npm install
```

### 2. Run the Extension

```bash
npm run dev
```

That's it! The extension will:
- Automatically read Firebase config from your iOS app's `GoogleService-Info.plist`
- Automatically use your app's Sign in with Apple authentication
- Just work!

### 3. Test It

1. Open Raycast (Cmd+Space or your custom hotkey)
2. Type "Add Task"
3. Try: `Buy milk #groceries @high /tomorrow`
4. Submit and check your iOS/macOS app - the task should appear instantly!

## Development Mode

To develop the extension with live reload:

```bash
npm run dev
```

This will:
- Watch for file changes
- Automatically rebuild
- Reload in Raycast

## Building for Distribution

```bash
npm run build
```

## Troubleshooting

### Extension won't import
- Make sure you ran `npm install` first
- Check that all dependencies installed successfully
- Try `npm run build` before importing

### Authentication errors
- Double-check your Firebase credentials
- Ensure you're using the same email/password as in your iOS app
- Verify your Firebase project has Auth enabled

### Tasks not syncing
- Check internet connection
- Verify Firebase credentials are correct
- Make sure Firestore security rules allow writes from your user
- Check Firebase console for any errors

### TypeScript errors
```bash
npm run lint
npm run fix-lint
```

## File Structure

```
raycast-extension/
├── src/
│   ├── add-task.tsx          # Main command UI
│   ├── types.ts              # TypeScript interfaces
│   └── utils/
│       ├── dateParser.ts     # Date parsing logic
│       ├── taskExtractor.ts  # Task title extraction
│       ├── parser.ts         # Main text parser
│       └── firebase.ts       # Firebase operations
├── assets/
│   └── icon.png             # Extension icon
├── package.json             # Dependencies & config
├── tsconfig.json           # TypeScript config
├── README.md               # User documentation
└── SETUP.md               # This file
```

## Testing Checklist

Before using in production, test these scenarios:

- [ ] Simple task: `Buy milk`
- [ ] Task with tag: `Meeting #work`
- [ ] Task with priority: `Fix bug @high`
- [ ] Task with date: `Call dentist /tomorrow`
- [ ] Combined: `Review PR #work @medium /friday`
- [ ] Natural language: `urgent: call the client by tomorrow`
- [ ] Verify task appears in iOS app
- [ ] Verify tags match existing tags
- [ ] Verify dates parse correctly
- [ ] Verify priorities are set correctly

## Next Steps

1. Replace the placeholder `assets/icon.png` with a proper icon
2. Test thoroughly with your existing tags and workflows
3. Consider publishing to Raycast Store (optional)
4. Report any issues or improvements needed

## Support

- Main app documentation: `/to-do/README.md`
- Firebase setup: See `FIREBASE_COMPLETE_SETUP_GUIDE.md` in root
- Quick add syntax: See `QUICK_ADD_SYNTAX_GUIDE.md` in root

