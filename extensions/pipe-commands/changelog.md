# Pipe Commands Changelog

## Add `Read the Content` Command (2022.04.07)

## Fixes (2022.03.08)

- Remove buggy file arguments
- Fix text input from clipboard
- Use List Details to preview commands content from the management view
- Add JSON schema for Pipe Commands and show parsing errors in UI
- Add a link to the README in the command templates
- Add better error reporting when running scripts

## Improvements (2022.03.08)

- Instead of presenting each output types for each pipe commands, this PR allows the developper to set the desired output using the @raycast.mode directive.
- Simplifies the update of built-in pipe commands distributed with the assets folder.
- A bug in the Create Pipe Command command was also corrected (outdated @raycast.input directive)

## Added Pipe Commands (2022.02.28)
