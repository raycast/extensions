# Alter Actions

Save your Alter actions in Raycast, choose selected text, clipboard text, custom text, or no input, and review the input before sending it to Alter.

## Set up

1. Install [Alter](https://alterhq.com/beta) and complete its account and provider setup.
2. In Alter, open **Action Editor**, choose an action, and copy its **General → URL Callback** URL.
3. Open **Run Alter Action** in Raycast and choose **Add Action**. Enter a name and paste the callback URL.
4. Select the saved action, choose an input source, and select **Preview Input**. Review the text, then choose **Send to Alter**.

Follow the [official Alter callback guide](https://docs.alterhq.com/workflows/url-callbacks). The extension does not seed examples as working actions; use a callback copied from your own configured Alter action. A callback containing example `input` has that parameter removed when saved. Fresh input comes only from the preview you approve for each run.

## Commands and shortcuts

- **Run Alter Action:** Search saved actions, prepare input, and hand it off to Alter.
- **⌘N:** Add a local action configuration.
- **⌘E:** Edit a saved action.
- **⌃X:** Delete a local configuration after confirmation. This does not delete the action in Alter.

## Data and behavior

Action names and callback URLs are saved in this extension’s Raycast LocalStorage. Input is held in memory for the current run and is not added to the saved configurations. Clipboard and selection are read only when you explicitly preview those sources. Selected text may require Raycast’s Accessibility permission.

Only `alter://action/action-id` callbacks with one optional `input` parameter are accepted. Other schemes, hosts, callback destinations, fragments, and extra query parameters are rejected. Supported action IDs contain letters, numbers, hyphens, or underscores. The extension limits saved actions to 100, input to 8,000 characters, and encoded URLs to 24,000 characters. Very large or unsupported callbacks should be used directly in Alter instead.

The handoff explicitly targets Alter’s bundle identifier `com.wearedevx.alter`. Opening the URL does not report whether the action finished. Read the result in Alter. The action can have whatever effects you configured there, including access to its connected tools or AI providers.

If local saved data is malformed, the extension stops using it. You can copy the data for recovery or explicitly reset it. It never silently clears unreadable configurations.

## Development

```sh
npm ci
npm run test
npm run typecheck
npm run lint
npm run build
npm run dev
```

The automated adapter tests validate callback destinations, exact input encoding, bounded input, storage parsing and edits, preview text fences, missing applications, and failed OS handoffs.
