# Dust.tt Changelog

## [fixes] - 2024-12-11

- Upgrade dust-tt/client to allow more flexibility in the api response.

## [fixes] - 2024-11-21

- Use the proper oauth audience and add scopes to limit api access.

## [Feature] - 2024-11-09

- Add support for Oauth connexion flow.
- Add Command to Select Workspace (oauth only)
- Add Command for Claude-3
- Use official Dust Client (removed custom implementation)
- Support dust favorite assistants feature (oauth only, removed the localStorage implementation)
- Fix icons for referenced documents
- Fix labels for assistant scopes
- Update wording to match Dust (especially agent -> assistant).
- Improve UX (thinking animation, abort fetching when exiting view...)

## [Feature] - 2024-10-01

- allow user to specify custom API URL

## [Feature] - 2024-09-24

- ask user to provide email address during the setup
- specify email address and username in API calls to provide accurate usage statistics

## [chore] - 2024-09-23

- transfer extension ownership to the Dust team

## [bug fixes] - 2024-07-22

- use `agent_message_success` event as stop condition
- don't stream Chain Of Thought tokens

## [bug fixes] - 2024-03-27

- fixed a bug when the favorite agent was no longer available
- fixed API related crashes (show an error)

## [Selected text fix] - 2023-12-17

- fix a bug where the selected text was not properly detected in same cases

## [UX improvements] - 2023-12-14

- better agent organization: sorted by name, in sections
- changed the shortcut for "Paste in current app" to "cmd + return"
- add a new action to edit the question on the answer screen
- do not crash on dust API connectivity issues when getting agents

## [Cleanup] - 2023-12-09

- **history:**
  - remove items older than 30 days
  - add a confirmation step when clearing the history
- code cleanup

## [Icons] - 2023-12-08

- Add icons for managed sources in answers/source list (Notion, Slack, Google Drive, Github, Intercom etc.)

## [Agent list and answer enhancements] - 2023-12-07

- **references:** links to sources when they exist
- **quick agent:** add a favorite dust agent that will be top of the list when you ask an agent a question. No more searching for it for the one you use every day
- API key is now hidden in the configuration
- Better design for item removal in history

## [Initial Version] - 2023-12-03
