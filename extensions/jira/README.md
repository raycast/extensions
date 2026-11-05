# Jira

Create, access and modify issues and sprints.

## Logging in with an API token

The Jira extension supports OAuth authentication by default. But if you want, you can log in with an API token instead. To do so, you must:

1. Get an API token as described [here](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).
2. Select any command from the Jira extension, then press `⌘` + `K` and scroll down to `Configure Extension`. Enter your email, API token, and Jira site URL (without `https://`) on the right. Note that all three must be provided to use API tokens (on macOS, the API token can come from the Keychain instead, see below).

### Reading the API token from the macOS Keychain

On macOS, instead of pasting the API token into Raycast, you can keep it in the login Keychain and share it with other tools. This option is not available on Windows; use the `API Token` field there.

```sh
# Copy the API token to the clipboard first; -U updates an existing item
security add-generic-password -U -a "$USER" -s jira-token -w "$(pbpaste)"

# Should print the full token length (about 192 characters)
security find-generic-password -s jira-token -w | tr -d '\n' | wc -c
```

Pass the token as an argument as shown. Don't use the interactive prompt (`-w` with no value): it truncates long values, and Atlassian API tokens are long enough to be cut off, which makes Jira reject them with `401`.

Leave `API Token` empty, set `Keychain Service Name` to `jira-token`, and fill in `Email` and `Jira Site URL` as above. An `API Token` value takes precedence over the Keychain. The token is read once per command run. Items created with `security` are readable by it without a prompt; for items created elsewhere macOS asks once—choose **Always Allow**. If the item is missing, commands report `Keychain item "<name>" not found`. To find the service name of an existing item, run `security find-generic-password -l "<Name in Keychain Access>" | grep svce`.

## Note

You can change the default `Git branch name` in preferences; the following keys are available:

- {issueKey}
- {issueSummary}
- {issueSummaryShort}
- {issueType}
- {projectKey}
