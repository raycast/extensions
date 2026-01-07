# Lokalise

A Raycast extension to quickly add translation keys to your Lokalise project.

## Features

- **Add Translation**: Add new translation keys directly from Raycast
- **View Translations**: Browse and search all translation keys in your Lokalise project
- Support for multiple platforms (Web, iOS, Android, Other)
- Plural form support
- Search and filter translations
- Copy translations to clipboard
- View detailed information about each translation key

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

## API Reference

This extension uses the [Lokalise API v2](https://developers.lokalise.com/reference/create-keys) to add translation keys.
