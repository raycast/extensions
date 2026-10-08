# Lokalise

A Raycast extension to quickly add translation keys to your Lokalise project.

## Features

- **Add Translation**: Add new translation keys directly from Raycast
- **View Translations**: Browse and search all translation keys in your Lokalise project
- **Sync Translations**: Automatically keep your local translations up to date with Lokalise
- **AI Tools for Raycast AI**: Let Raycast AI search, add, and manage translation keys with natural language
- Support for multiple platforms (Web, iOS, Android, Other)
- Plural form support
- Search and filter translations
- Copy translations to clipboard
- View detailed information about each translation key
- User confirmation for AI-suggested keys to prevent mistakes

## Setup

1. **Get your Lokalise API Token**:
   - Go to your Lokalise profile settings
   - Navigate to "Personal access tokens"
   - Create a new token with read/write permissions

2. **Get your Project ID**:
   - Open your Lokalise project
   - Go to Project Settings
   - Copy the Project ID

3. **Configure the Extension**:
   - Open Raycast preferences
   - Find the "Lokalise" extension
   - Enter your API Token and Project ID in the extension preferences

## Usage

### Add Translation

1. Open Raycast (⌘ + Space)
2. Type "Add Translation" or use the command shortcut
3. Fill in the form:
   - **Key Name**: The translation key identifier (e.g., `common.button.save`)
   - **Translation Value**: The default translation text (usually English)
   - **Is Plural**: Check if this key requires plural forms
   - **Platform**: Select the target platform
4. Submit the form to add the key to Lokalise

### View Translations

1. Open Raycast (⌘ + Space)
2. Type "View Translations" or use the command shortcut
3. Browse all translation keys in your project
4. Use the search bar to filter by key name or translation text
5. Actions available:
   - **⌘K**: Copy key name to clipboard
   - **⌘C**: Copy translation to clipboard
   - **View Details**: See all translations and metadata for a key
   - **⌘R**: Refresh the list

### Sync Translations

The extension includes an automatic background sync feature that keeps your local translation database up to date with Lokalise:

1. **How it works**: The extension automatically syncs translations from Lokalise every hour (by default)
2. **Status indicator**: The command subtitle in Raycast shows when the last sync occurred and the sync status
3. **Initial setup**: You must run the command manually once after installation to complete the initial sync
4. **Configuration**: 
   - Background sync is disabled by default when first installed
   - Enable it in the command preferences (Raycast will add these automatically)
   - The sync runs silently in the background without interrupting your work
5. **Manual trigger**: You can also run "Sync Translations" manually from Raycast to force an immediate sync

**Why use background sync?**
- Always have the latest translations available offline
- Faster search and browsing (no API calls needed)
- Works even when you're offline (uses cached data)
- Reduces API rate limit usage

### Using Raycast AI with Lokalise

This extension provides AI tools that allow Raycast AI to interact with your Lokalise project using natural language. You can ask Raycast AI to:

**Extract Keys from Screenshots/Designs:**
```
"Extract translation keys from this Figma screenshot" [attach image]
"What text needs to be translated in this design?" [attach image]
"Analyze this UI mockup and suggest translation keys" [attach image]
```

**Search for Translation Keys:**
```
"Find all translation keys related to login"
"Search for keys containing 'button' on the iOS platform"
"Show me translation keys for error messages"
```

**Add New Translation Keys:**
```
"Add a translation key 'common.button.submit' with value 'Submit' for web"
"Create a new key 'home.title.welcome' with text 'Welcome to our app' for iOS"
```

**Get Key Details:**
```
"Show me details for the key 'common.button.save'"
"What translations exist for 'home.title.welcome'?"
```

**Workflow Example:**
1. Take a screenshot of your Figma design
2. Open Raycast AI and attach the screenshot
3. Say: "Extract translation keys from this design for iOS"
4. AI will analyze the image and list all translatable text with suggested key names
5. Review the suggestions and say: "Add the first three keys to Lokalise"
6. Confirm each key addition when prompted

**Important:** When AI suggests adding keys, you'll always see a confirmation dialog before any keys are added to Lokalise. This prevents accidental or incorrect additions.

## API Reference

This extension uses the [Lokalise API v2](https://developers.lokalise.com/reference/create-keys) to add translation keys.
