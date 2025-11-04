# Google Chrome Extension

- Open new tabs in Google Chrome
- Search and jump to currently open tabs in Google Chrome Browser
- Search and open Google Chrome tabs from search query based on browser history across all profiles
- Search and open Google Chrome tabs from search query based on bookmarks across all profiles
- Close tabs
- Create new window in Google Chrome

## Search Features

The extension supports advanced search functionality with exclude terms:

- **Include terms**: Type words normally to search for content containing those terms
- **Exclude terms**: Prefix words with ` -` (space + dash) to exclude results containing those terms
- **Literal dash**: Use `\-` to search for the literal `-` character

### Examples

- `raycast chrome` - Find items containing both "raycast" and "chrome"
- `raycast -firefox` - Find items containing "raycast" but not "firefox"
- `javascript -react -vue` - Find items containing "javascript" but excluding "react" and "vue"
- `-ads -tracking` - Exclude items containing "ads" or "tracking"
- `foo \-bar` or `foo-bar` - Find items containing "foo" and the literal "-bar" (e.g., URLs like "example.com/foo-bar")

_Note_:

Open profile support is limited to opening tab in new profile window. You can customize default tab opening behaviour in settings.

If you are using `Default` mode and have multiple profiles open in parallel, the tab will open in the topmost window.

These are due to limitations in the Chrome API.
