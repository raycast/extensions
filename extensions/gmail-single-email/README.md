# Gmail - Single Email Raycast Extension

View the single, most recent email from your Gmail inbox directly in Raycast.

This extension is designed to help reduce procrastination by providing quick access to essential information often found in the latest email (like verification codes, links, or brief updates) without needing to open the full Gmail interface.

## Features

* Displays the subject, sender, recipients (To/Cc), date, and plain text body of the latest email in your inbox.
* Shows a list of attachments with download actions.
* Provides actions to:
  * Open the email in Gmail (web).
  * Download attachments.
  * Mark as Read/Unread.
  * Archive the email.
  * Delete the email (move to Trash).
  * Copy the Web URL or Message ID.
  * Refresh the view.

## Setup Instructions

This extension requires you to provide your own Google Cloud OAuth 2.0 Client ID for authentication. This ensures your connection details remain private.

**1. Create/Select a Google Cloud Project:**
   * Go to the [Google Cloud Console](https://console.cloud.google.com/).
   * Create a new project (e.g., "Raycast Gmail Access") or select an existing one.

**2. Enable the Gmail API:**
   * In your selected project, navigate to "APIs & Services" > "Library".
   * Search for "Gmail API" and enable it.

**3. Configure OAuth Consent Screen:**
   * Go to "APIs & Services" > "OAuth consent screen".
   * Choose **External** user type.
   * Fill in the required app information (App name: e.g., "Raycast Gmail Single Email", User support email: your email).
   * Add your email address under "Developer contact information".
   * **Scopes:** You don't need to add scopes here; the extension will request them.
   * **Test Users:** Add your own Google account email address as a test user. This is crucial while the app is in "testing" status.
   * Review and save the consent screen configuration.

**4. Create OAuth 2.0 Client ID:**
   * Go to "APIs & Services" > "Credentials".
   * Click "+ CREATE CREDENTIALS" > "OAuth client ID".
   * Select **Desktop app** as the Application type.
   * Give it a name (e.g., "Raycast Gmail Desktop Client").
   * Click "Create".

**5. Copy Client ID:**
   * A pop-up will show your "Client ID" and "Client Secret". **You only need the Client ID.** Copy it.

**6. Enter Client ID in Raycast:**
   * Open Raycast Preferences > Extensions.
   * Find the "Gmail - Single Email" extension.
   * Paste the copied **Client ID** into the "OAuth Client ID" preference field.

**7. Authorize:**
   * Run the "Single Email" command in Raycast for the first time.
   * You will be prompted to sign in to your Google Account and grant permission for the requested scopes.

## Usage

Simply run the "Single Email" command from Raycast to view the details and attachments of your latest inbox email. Use the Action Panel (`⌘` + `K`) to perform actions on the email.

## Ethical Transparency & Data Handling

* **Authentication:** This extension uses Google OAuth 2.0 (via Raycast's built-in capabilities) to securely access your Gmail account.
* **Data Access:** It requests permission to read your email metadata and content (`gmail.readonly`) and modify email status (`gmail.modify`) solely to display the latest email and perform the actions you trigger (like marking as read, archiving, or deleting).
* **Data Storage:** Your OAuth tokens are stored securely by Raycast in the macOS Keychain. This extension **does not** store your email content or metadata anywhere. It only fetches the latest email data from the Gmail API when you run the command.
* **Client ID:** Your Google Cloud OAuth Client ID is stored within Raycast's preferences. Keep this secure.

## License

This extension is licensed under the MIT License.

## Credits

This extension was forked from the original [Gmail Extension](https://www.raycast.com/tonka3000/gmail) by tonka3000 and modified to focus only on displaying the latest email.
