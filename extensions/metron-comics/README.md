# Metron Comics (Raycast Extension)

This Raycast extension browses new comic releases and searches the Metron Comic Book Database.

Setup
1. Register for a Metron account at https://metron.cloud and note your credentials.
2. Open Raycast, go to Extensions → Metron Comics → Preferences.
   - Set **Metron Username** and **Metron Password** to your Metron credentials.
   - Optionally set a **Default Publisher Filter** to limit the "New Comics" view.

Usage
- Run the "New Comics This Week" command to browse weekly releases.
- Use the "Search Comics" command to search by series name (e.g. "Gideon Falls") or add an issue number (e.g. "Batman 1").

Security
- Your credentials are stored by Raycast's secure preferences store. Do not commit credentials to source control.

Troubleshooting
- If you see an authentication error, double-check your username and password in Raycast Preferences.
- If you hit rate limits, wait a moment and try again.

Development
- Run `npm run dev` (or `ray develop`) to run the extension locally.
