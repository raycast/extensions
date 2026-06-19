# HEY Mail + Calendar

Browse [HEY](https://www.hey.com) mail, calendar, and habits from Raycast using the official `hey` CLI.

## Setup

1. Install the **hey CLI** and log in:

   ```bash
   hey auth login
   ```

2. Verify everything works:

   ```bash
   hey auth status
   hey doctor
   ```

3. Install this extension in Raycast (`npm run dev` during development).

4. Optional: set **hey CLI Path** in Raycast Preferences → Extensions → HEY to match `which hey` in Terminal.

## Troubleshooting auth

If Terminal shows you are logged in but the extension says **Sign in to HEY**:

1. Run `which hey` in Terminal and set that exact path in extension preferences.
2. Use **Log in With Hey CLI** inside the extension (credentials must work from Raycast's context, not only Terminal).
3. Run **Check Authentication** to verify the resolved CLI path.

The extension runs `hey` via AppleScript's `do shell script` so it can access the same keychain credentials as Terminal ([Raycast runAppleScript](https://developers.raycast.com/utilities/functions/runapplescript.md)).

## Commands

| Command | Description |
| --- | --- |
| Browse Mail | Browse HEY mailboxes, read threads, mark seen/unseen, reply |
| Compose Email | Send a new email with to/cc/bcc/subject/body |
| Drafts | List drafts and open them in HEY |
| Calendar | Browse color-coded calendars and upcoming events |
| Habits | View today's habits and mark them complete/incomplete |
| Check Authentication | Run auth status + doctor checks |

## CLI reference

This extension shells out to `hey` with `--json`. Useful commands:

```bash
hey boxes --json
hey box imbox --json
hey threads <topic_id> --json
hey compose --to user@example.com --subject "Hello" -m "Body"
hey reply <topic_id> -m "Thanks"
hey calendars --json
hey recordings <calendar_id> --json
hey habit complete <id>
hey habit uncomplete <id>
```

Topic IDs come from posting URLs like `https://app.hey.com/topics/123`.

## Calendar colors

HEY calendars expose a `color` field (`teal`, `blue`, `pink`, `red`, `purple`, `green`, etc.). The extension maps these to Raycast tint colors per the [Raycast Colors API](https://developers.raycast.com/api-reference/user-interface/colors.md).

## Habits

Habits are loaded from `hey recordings` on your personal calendar. Optionally set **Habits Calendar ID** in preferences if auto-detection picks the wrong calendar.

## Privacy

Authentication is handled entirely by the `hey` CLI and stored in your system keyring. This extension does not store HEY credentials.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Publish

```bash
npm run publish
```

See [Publish an Extension](https://developers.raycast.com/basics/publish-an-extension.md) and [Extensions Guidelines](https://manual.raycast.com/extensions-guidelines).
