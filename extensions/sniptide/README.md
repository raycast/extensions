# Sniptide

Search your [Sniptide](https://sniptide.com) pastes from Raycast, paste their code into the app
you're working in, and share your clipboard or selection as a link.

## Set up

1. In Sniptide, open **Settings** > **API tokens** and create a token. Searching needs **Read**
   access, and the commands that create pastes need **Write** access.
2. Run any Sniptide command in Raycast and paste the token into **API Token**.
3. **Instance Address** defaults to Sniptide Cloud. If you run your own instance, enter its address, such as
   `https://paste.example.com`.

Raycast keeps the token in a password preference, and the extension sends it only to the instance
you set.

## Commands

| Command                | What it does                                                                                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Search Pastes**      | Searches titles, descriptions, tags, file names and code. Enter pastes the code into the frontmost app, and the action panel copies the code or the link, shows the paste, or opens it in Sniptide. The dropdown narrows the search to one collection. |
| **Search Collections** | Finds a collection and lists the pastes in it.                                                                                                                                                                                                         |
| **Create Paste**       | Opens a form with your selection, or your clipboard when nothing is selected. You choose the title, file name, visibility and collection, and the link is copied when the paste is created.                                                            |
| **Share Selection**    | Saves the selected text as a paste and copies its link.                                                                                                                                                                                                |
| **Share Clipboard**    | Saves the clipboard's text as a paste and copies its link.                                                                                                                                                                                             |

A paste with several files asks which file you want. Encrypted pastes don't appear, because their
key never leaves the browser.

## Preferences

| Preference                         | Default                    | What it changes                                                                                                                |
| ---------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **API Token**                      | None                       | The token every command signs in with.                                                                                         |
| **Instance Address**               | `https://app.sniptide.com` | The Sniptide instance to reach. Plain `http://` works only for `localhost`.                                                    |
| **Visibility for New Pastes**      | Unlisted                   | Who can open a paste created from Raycast. Share Selection and Share Clipboard always use it, and Create Paste starts with it. |
| **Primary Action** (Search Pastes) | Paste                      | Whether Enter pastes the code into the frontmost app or copies it.                                                             |

Share Selection and Share Clipboard name the file `snippet.txt`, or `snippet.json` for valid JSON.
Use Create Paste to name the file yourself, because Sniptide reads the language from the file
extension.

The full guide is in the [Sniptide docs](https://docs.sniptide.com/raycast-extension).
