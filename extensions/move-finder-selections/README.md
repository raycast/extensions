# Finder Selection Move

Search for folders to move Finder selections to.

It is useful if you want to move Finder selections to a folder that is not in the sidebar or if you want to move them to a folder that is not in the same window.
Recommended to use with a keyboard shortcut so that you can move Finder selections quickly.

This extension is a fork of [Folder Search](https://www.raycast.com/GastroGeek/folder-search) while importing some logics from [Open With Apps](https://www.raycast.com/fturcheti/open-with-app).
Since the workflow of original Folder Search extension does not align with that of the above, I decided to create a new extension.

---
The following comes from the Folder Search's README, which should still work for this extension:

## Plugins

You can add your own custom `AppleScript` plugins to Folder Search. These appear as actions, under the sub-heading 'Plugins' within Folder Search.

The steps are as follows:

* Configure the Folder Search extension via Raycast
    * Ensure the `Plugins Enabled` option is checked
    * Populate `Plugins Folder (Absolute Path)` with a valid **absolute** path to where you plugins reside
        * e.g: `/Users/GastroGeek/Documents/FolderSearchPlugins`

* Create one or more plugins with the following schema (they are just `.js` files):

### e.g. Plugin Path

```
/Users/GastroGeek/Documents/FolderSearchPlugins/open-alt.js
```

### e.g. Plugin file contents (open-alt.js)

```js
// note the export name!
exports.FolderSearchPlugin = {
  // the title of the action as shown
  // in the Actions Menu in Raycast.
  title: 'Open Alt',

  // the desired keyboard shortcut in the same
  // format as with Raycast's API but with only
  // single braces: `{` and `}`.
  shortcut: { modifiers: ["cmd", "shift"], key: 'a' },

  // the `Icon` name without the Icon enum prefix.
  icon: 'Link',

  // a function which takes the result that was selected at the time of execution and returns a valid AppleScript. This AppleScript is what gets executed.
  appleScript: (result) => {
    return `do shell script "open ${result.path}"`
  }
}
```

For reference, the `result` argument passed into the `appleScript` function is as follows (based on mdfind properties)

```js
{
  path: '/Users/GastroGeek/Music',
  kMDItemDisplayName: 'Music',
  kMDItemFSCreationDate: '2016-04-22T20:42:52.000Z',
  kMDItemFSName: 'Music',
  kMDItemContentModificationDate: '2022-07-08T15:44:01.000Z',
  kMDItemKind: 'Folder',
  kMDItemLastUsedDate: '2022-09-14T10:09:45.000Z'
}
```

You will likely only need/use the `path` property.