// note the export name!
exports.FolderSearchPlugin = {
  // the title of the action as shown
  // in the Actions Menu in Raycast.
  title: 'Open Path',

  // the desired keyboard shortcut in the same
  // format as with Raycast's API but with only
  // single braces: `{` and `}`.
  shortcut: { modifiers: ["cmd", "shift"], key: 'a' },

  // the `Icon` name without the Icon enum prefix.
  icon: 'Link', // More visually distinct

  // a function which takes the result that was selected at the time of execution and returns a valid AppleScript. This AppleScript is what gets executed.
  appleScript: (result) => {
    return `do shell script "open '${result.path}'"`;
  }
};