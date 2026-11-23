# Apple Mail

Check, read and write email in Apple Mail without switching to it. Paste one-time codes from your inbox in one step.

## Commands

**Read**

- **See Recent Mail**: Recent unread messages.
- **See Important Mail**: Messages in your important mailboxes.
- **See Mail Accounts**: All your accounts.
- **Check for New Mail** and **Refresh Mail**: Fetch new mail for all accounts.
- **Mark All as Read**: Clear your unread count.

**Write**

- **Compose New Message**: Write and send an email.
- **Share with Mail**: Send the files selected in Finder as attachments.

**Utilities**

- **Paste Latest Otp Code**: Finds the latest one-time code in your email and pastes it.
- **Copy Mail Deeplink**: Copies a link to the selected email.
- **Save Mail as File** copies the first selected email in the foremost Mail window as an `.eml` file and can also save it to the configured folder.
- **Clear Cache**: Clears the cached data for all accounts.

Select an email in Apple Mail, run **Save Mail as File**, and paste the exported file into Finder or another app. If several emails are selected, the command exports the first one. By default, the command also saves the file to **Save Files To**. Existing files are kept, and repeated saved exports receive a numbered filename.

Turn off **Save Exported Emails** in the command's preferences to copy the file without saving it to Downloads or your configured folder. The command keeps one subject-named `.eml` file in the extension's `clipboard` support folder. If the filename stays the same, its contents are replaced. If the filename changes, the previous `.eml` file is removed. Only the latest clipboard-only export remains available, so earlier clipboard-history entries may no longer work after another export. After a successful export, the command also cleans up the temporary folders created by earlier versions.

The EML export keeps the raw message source, including its attachments. Apple Mail must have downloaded the message before it can be exported.

The command reports whether it is exporting, saving, or copying the file. If an export fails, Raycast shows the full error report. Choose **Copy Error** or press **⌘C** to copy it. In development mode, the terminal also reports the failed step and its error details. Successful exports close the window automatically.

## Use it with Raycast AI

Mention `@mail` in Raycast AI to search, read, reply to, forward, move and send email in plain language. For example, "summarize the unread emails from today" or "reply to Anna and say Thursday works". It can also list and save attachments.

## Preferences

- **Save Files To** controls where attachments and exported emails are saved. It defaults to `~/Downloads`.
- **Save Exported Emails** controls whether **Save Mail as File** also saves the file to **Save Files To**. It is enabled by default. Turning it off only copies the file to the clipboard.
- **Only show unread messages** (See Recent Mail).
