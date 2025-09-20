# Things

Search and manage your Things to-dos from Raycast.

## Authentication token

The extension uses the [Things URL Scheme](https://culturedcode.com/things/support/articles/2803573/) under the hood to enable certain features, such as scheduling a to-do, or moving a to-do to a project/area. For security reasons, these operations require an authentication token that you can set by following these instructions:

1. Get your authentication token in `Things → Settings → General → Enable Things URLs → Manage`.
2. Paste the token in the extension's preferences.

## Troubleshooting

If you don't see any of your to-dos in any commands, please make sure Things is installed and running before using this extension. If Things is running, you may need to grant Raycast access to Things in `System Settings > Privacy & Security > Automation > Raycast > Things`.

## Commands

### Quick Add To-do

Raycast AI is used to select the deadline, list, tags etc. If Raycast AI is not accessible or user has selected `Don't use AI`
preference, all the quickly created to-do(s) will be sent to Inbox, but the title will still be parsed for assigning deadlines
and list name followed with '#' in title (case-insensitive).

**Examples (with AI):**
* Book flights today in my Trips list -> Creates to-do with title "Book flights" classified in "today" and list "Trips".
* Add milk to my groceries list for tomorrow with Errand tag -> Creates to-do with title "Milk" classified in "tomorrow" with list "groceries" and tag "Errand".
* Buy a new car by the end of the year -> Creates to-do with title "Buy a new car" and deadline "20..-12-31".

**Examples (without AI):**
* Complete project -> Creates to-do with title "Complete project" in "Inbox".
