# Manifest

The `package.json` manifest file is a superset of npm's `package.json` file. This way, you only need one file to configure your extension. This document covers only the Raycast specific fields. Refer to [npm's documentation](https://docs.npmjs.com/cli/v7/configuring-npm/package-json) for everything else.

Here is a typical manifest file:

```javascript
{
  "name": "my-extension",
  "title": "My Extension",
  "description": "My extension that can do a lot of things",
  "icon": "icon.png",
  "author": "thomas",
  "categories": ["Fun", "Communication"],
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

| Property     | Required | Description                                                                                                                                                                                                                                         |
| ------------ | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name         | Yes      | A unique name for the extension. This is used in the Store link to your extension, so keep it short and URL compatible.                                                                                                                             |
| title        | Yes      | The title of the extension that is shown to the user in the Store as well as the preferences. Use this title to describe your extension well that users can find it in the Store.                                                                   |
| description  | Yes      | The full description of the extension shown in the Store.                                                                                                                                                                                           |
| icon         | Yes      | A reference to an icon file in the assets folder. Use png format with a size of 512 x 512 pixels. To support light and dark theme, add two icons, one with `@dark` as suffix, e.g. `icon.png` and `icon@dark.png`.                                  |
| author       | Yes      | Your Raycast Store handle (username)                                                                                                                                                                                                                |
| categories   | Yes      | An array of categories that your extension belongs in.                                                                                                                                                                                              |
| commands     | Yes      | An array of commands exposed by the extension, see [Command properties](manifest.md#command-properties).                                                                                                                                            |
| contributors | No       | An array of Raycast store handles (usernames) of people who have contributed to this extension.                                                                                                                                                     |
| keywords     | No       | An array of keywords for which the extension can be searched for in Raycast.                                                                                                                                                                        |
| preferences  | No       | Extensions can contribute preferences that are shown in Raycast Preferences > Extensions. You can use preferences for configuration values and passwords or personal access tokens, see [Preference properties](manifest.md#preference-properties). |
| external     | No       | An Array of package or file names that should be excluded from the build. The package will not be bundled, but the import is preserved and will be evaluated at runtime.                                                                            |

## Command properties

All properties for a command.

| Property          | Required | Description                                                                                                                                                                                                                                                                                                                                                                                                     |
| ----------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name              | Yes      | A unique id for the command. The name directly maps to the entry point file for the command. So a command named "index" would map to `index.ts` (or any other supported TypeScript or JavaScript file extension such as `.tsx`, `.js`, `.jsx)`.                                                                                                                                                                 |
| title             | Yes      | The display name of the command, shown to the user in Raycast.                                                                                                                                                                                                                                                                                                                                                  |
| subtitle          | No       | The optional subtitle of the command in the root search. Usually, this is the service or domain that your command is associated with. You can dynamically update this property using [`updateCommandMetadata`](../api-reference/command.md#updatecommandmetadata).                                                                                                                                                                                                                                                                           |
| description       | Yes      | It helps users understand what the command does. It will be displayed in the Store and in Preferences.                                                                                                                                                                                                                                                                                                          |
| icon              | No       | <p>An optional reference to an icon file in the assets folder. Use png format with a size of at least 512 x 512 pixels. To support light and dark theme, add two icons, one with <code>@dark</code> as suffix, e.g. <code>icon.png</code> and <code>icon@dark.png</code>.</p><p>If no icon is specified, the extension icon will be used.</p>                                                                   |
| mode              | Yes      | A value of `view` indicates that the command will show a main view when performed. `no-view` means that the command does not push a view to the main navigation stack in Raycast. The latter is handy for directly opening a URL or other API functionalities that don't require a user interface. `menu-bar` indicates that this command will return a [Menu Bar Extra](../api-reference/menu-bar-commands.md) |
| interval          | No       | The value specifies that a `no-view` or `menu-bar` command should be launched in the background every X seconds (s), minutes (m), hours (h) or days (d). Examples: 90s, 1m, 12h, 1d. The minimum value is 1 minute (1m).                                                                                                                                                                                        |
| keywords          | No       | An optional array of keywords for which the command can be searched in Raycast.                                                                                                                                                                                                                                                                                                                                 |
| arguments         | No       | An optional array of arguments that are requested from user when command is called, see [Argument properties](manifest.md#argument-properties).                                                                                                                                                                                                                                                                 |
| preferences       | No       | Commands can optionally contribute preferences that are shown in Raycast Preferences > Extensions when selecting the command. You can use preferences for configuration values and passwords or personal access tokens, see [Preference properties](manifest.md#preference-properties). Commands automatically "inherit" extension preferences and can also override entries with the same `name`.              |
| disabledByDefault | No       | <p>Specify whether the command should be enabled by default or not. By default, all commands are enabled but there are some cases where you might want to include additional commands and let the user enable them if they need it.</p><p><em>Note that this flag is only used when installing a new extension or when there is a new command.</em></p>                                                         |

## Preference properties

All properties for extension or command-specific preferences. Use the [Preferences API](../api-reference/preferences.md) to access their values.

| Property    | Required                                     | Description                                                                                                                                                                                                                                                                                                                                   |
| ----------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name        | Yes                                          | A unique id for the preference.                                                                                                                                                                                                                                                                                                               |
| description | Yes                                          | It helps users understand what the preference does. It will be displayed as a tooltip when hovering over it.                                                                                                                                                                                                                                  |
| type        | Yes                                          | The preference type. We currently support `"textfield"` and `"password"` (for secure entry), `"checkbox"`, `"dropdown"`, `"appPicker"`, `"file"`, and `"directory"`.                                                                                                                                                                          |
| required    | Yes                                          | Indicates whether the value is required and must be entered by the user before the extension is usable.                                                                                                                                                                                                                                       |
| title       | No when `type` is `checkbox`. Yes otherwise. | <p>The display name of the preference shown in Raycast preferences.</p><p>For checkboxes it is shown as a section title above the checkbox itself.</p><p>If you want to group multiple checkboxes into a single section, set the <code>title</code> of the first checkbox and leave the <code>title</code> of the other checkboxes empty.</p> |
| placeholder | No                                           | Text displayed in the preference's field when no value has been input.                                                                                                                                                                                                                                                                        |
| default     | No                                           | The optional default value for the field. For textfields, this is a string value; for checkboxes a boolean; for dropdowns the value of an object in the data array; for appPickers an application name, bundle ID or path.                                                                                                                    |
| data        | Yes when `type` is `dropdown`. No otherwise  | An array of objects with `title` and `value` properties, e.g.: `[{"title": "Item 1", "value": "1"}]`                                                                                                                                                                                                                                          |
| label       | Yes when `type` is `checkbox`. No otherwise. | Required, checkboxes only: The label of the checkbox. Shown next to the checkbox.                                                                                                                                                                                                                                                             |

## Argument properties

All properties for command arguments. Use the [Arguments API](./lifecycle/arguments.md) to access their values.

| Property    | Required | Description                                                                                                                                                                                                                   |
| ----------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name        | Yes      | A unique id for the argument. This value will be used to as the key in the object passed as [top-level prop](./lifecycle/arguments.md#arguments).                                                                             |
| type        | Yes      | The argument type. We currently support `text` and `password` (for secure entry). When the type is `password`, entered text will be replaced with asterisks. Most common use case – passing passwords or secrets to commands. |
| placeholder | Yes      | Placeholder for the argument's input field.                                                                                                                                                                                   |
| required    | No       | Indicates whether the value is required and must be entered by the user before the command is opened. Default value for this is `false`.                                                                                      |
