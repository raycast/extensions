# BetterTouchTool Changelog

## AI Tools & Variable Commands - {PR_MERGE_DATE}

- Add Raycast AI Extension tools: search-named-triggers, run-named-trigger, get-variable-value, set-variable-value, search-action, run-action
- Rewrite of named triggers page for better performance and usability
- Add commands to get and set variables: get-variable, set-string-variable, set-number-variable
- Add new preferences for Most Used Count, Default Action for Named Trigger, and Default Action for Set Variable

## Error handling - 2024-04-28

- Update dependencies and use `runAppleScript` function from utils
- Check for BTT to be active before accessing scripting interface
- Option to run triggers after closing Raycast window

## [Shared Secrets] - 2023-05-10

- Add support for shared secrets in BTT
- Handle error when scripting is disabled in BTT
- Format action names with spaces and add matching icons
- Update to latest Raycast api (v1.50.0)

## [Feedback] - 2023-02-24

- Add icons to Action Panel Items
- Make named trigger filter Dropdown more intuitive

## [Initial Version] - 2023-02-16

- Add action and named trigger search commands
