<p align="center">
    <img src="./assets/raindrop-icon-big.png" width="150" height="150" />
</p>

# Raindrop.io

This is a [Raycast](https://raycast.com/) extension for [Raindrop.io](https://raindrop.io).

## Instructions

### API Access Token

For this extension we need a test access token, for this you need to create an app in Raindrop's [settings](https://app.raindrop.io/settings/integrations).

1. In the **For Developers** section click on **+ Create new app**.
2. Set the app **name**, accept the Terms and Guidelines and click **Create**.
3. Click in the newly created app.
4. In the bottom of the form click on **Create test token**.
5. Copy the created token.

Install the extension and the first time you run any command it will ask you for your new token.

### AI-Powered Suggestions (via Gemini)

This extension now includes a powerful AI feature to automatically suggest a title, description, collection, and tags for the links you save.

1.  When adding a new bookmark, use the action `Use AI Tagging` (or the shortcut `⌘+⇧+A`).
2.  The AI will analyze the link's content and suggest relevant metadata.

To enable this feature, you need a Google AI API key:

1.  Go to [Google AI Studio](https://aistudio.google.com/app/apikey) and create an API key.
2.  Open the extension preferences in Raycast and paste your key into the `Gemini API Key` field.

### Browser Extension (Recommended)

For enhanced functionality when capturing URLs and titles, we recommend installing the [Raycast Browser Extension](https://www.raycast.com/browser-extension). This extension provides better integration with your browser for a smoother experience.

### Open in Browser Configuration

The primary `Action` will open links in default browser. In `Preferences` you can select a secondary browser which will add a new `Action` for opening in that browser, instead. If you selected an invalid app (i.e. an app that is not a browser), link will open in default browser.