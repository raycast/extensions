# Manifest

The `package.json` manifest file is a superset of npm's `package.json` file. This way you only need one file to configure your extension. This document covers only the Raycast specific fields. Refer to [npm's documentation](https://docs.npmjs.com/cli/v7/configuring-npm/package-json) for everything else.

Here is a typical manifest file:

```javascript
{
  "name": "my-extension",
  "title": "My Extension",
  "description": "My extension that can do a lot of things",
  "icon": "icon.png",
  "author": "thomas",
  "license": "MIT",
  "commands": [
    {
      "name": "index",
      "title": "Send Love",
      "description": "A command to send love to each other",
      "mode": "view"
    }
  ]
}
```

## Extension properties

All Raycast related properties for an extension.

| Property     | Description                                                                                                                                                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name         | A unique name for the extension. This is used in the Store link to your extension, so keep it short and URL compatible.                                                                                                                             |
| title        | The title of the extension that is shown to the user in the Store as well as the preferences. Use this title to describe your extension well that users can find it in the Store.                                                                   |
| description  | The full description of the extension shown in the Store.                                                                                                                                                                                           |
| icon         | A reference to an icon file in the assets folder. Use png format with a size of 512 x 512 pixels. To support light and dark theme, add two icons, one with `@dark` as suffix, e.g. `icon.png` and `icon@dark.png`.                                  |
| author       | Your Raycast store handle (username)                                                                                                                                                                                                                |
| contributors | An optional array of Raycast store handles (usernames) of people who have contributed to this extension.                                                                                                                                            |
| keywords     | An optional array of keywords for which the extension can be searched for in Raycast.                                                                                                                                                               |
| commands     | An array of commands exposed by the extension, see [Command Properties](manifest.md#command-properties).                                                                                                                                            |
| preferences  | Extensions can contribute preferences that are shown in Raycast Preferences > Extensions. You can use preferences for configuration values and passwords or personal access tokens, see [Preference Properties](manifest.md#preference-properties). |
| external     | Optional array of package or file names that should be excluded from the build. The package will not be bundled but the import is preserved and will be evaluated at runtime.                                                                       |

## Command properties

All properties for a command.

| Property    | Description                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name        | A unique name for the command. The name directly maps to the entry point file for the command. So a command named "index" would map to `index.ts` (or any other supported TypeScript or JavaScript file extension such as `.tsx`, `.js`, `.jsx)`.                                                                                                                                                  |
| title       | The display name of the command, shown to the user in Raycast.                                                                                                                                                                                                                                                                                                                                     |
| subtitle    | The optional subtitle of the command in the root search. Usually this is the service or domain that your command is associated with.                                                                                                                                                                                                                                                               |
| description | The full description of the command shown in the Raycast store.                                                                                                                                                                                                                                                                                                                                    |
| icon        | <p>An optional reference to an icon file in the assets folder. Use png format with a size of at least 512 x 512 pixels. To support light and dark theme, add two icons, one with <code>@dark</code> as suffix, e.g. <code>icon.png</code> and <code>icon@dark.png</code>.</p><p></p><p>If no icon is specified, the extension icon will be used.</p>                                               |
| mode        | A value of `view` indicates that the command will show a main view when performed. `no-view` means that the command does not push a view to the main navigation stack in Raycast. Latter is handy for directly opening URL or other API functionality that doesn't require a user interface.                                                                                                       |
| keywords    | An optional array of keywords for which the command can be searched in Raycast.                                                                                                                                                                                                                                                                                                                    |
| preferences | Commands can optionally contribute preferences that are shown in Raycast Preferences > Extensions when selecting the command. You can use preferences for configuration values and passwords or personal access tokens, see [Preference Properties](manifest.md#preference-properties). Commands automatically "inherit" extension preferences and can also override entries with the same `name`. |

## Preference properties

All properties for extension or command specific preferences. Also see the [Preferences API Reference](../api-reference/preferences.md#preference) for more details.

| Property    | Description                                                                                                                                                                                                                                                                                                                                                       |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name        | A unique name for the preference.                                                                                                                                                                                                                                                                                                                                 |
| type        | The preference type. Currently we support type `"textfield"` and `"password"` (for secure entry), `"checkbox"`, and `"dropdown"`.                                                                                                                                                                                                                                 |
| required    | Indicates whether the value is required and must be entered by the user before the extension is usable.                                                                                                                                                                                                                                                           |
| title       | <p>The display name of the preference, shown to the user in Raycast preferences.</p><p></p><p>For checkboxes it is shown as a section title above the checkbox itself.</p><p>If you want to group multiple checkboxes into a single section, set the <code>title</code> of the first checkbox and leave the <code>title</code> of the other checkboxes empty.</p> |
| description | The full description of the preference, shown as tooltip for the field.                                                                                                                                                                                                                                                                                           |
| placeholder | The optional placeholder text shown in the preference field.                                                                                                                                                                                                                                                                                                      |
| default     | The optional default value for the field. For textfields, this is a string value; for checkboxes a boolean; for dropdowns the value of the selected item.                                                                                                                                                                                                         |
| data        | Optional, dropdowns only: An array of objects with `title` and `value` properties, e.g.: `[{"title": "Item 1", "value": "1"}]`                                                                                                                                                                                                                                      |
| label       | Required, checkboxes only: The label of the checkbox. Shown next to the checkbox.                                                                                                                                                                                                                                                                                 |
