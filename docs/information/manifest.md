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

| Property                                      | Description                                                                                                                                                                                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name<mark style="color:red;">\*</mark>        | A unique name for the extension. This is used in the Store link to your extension, so keep it short and URL compatible.                                                                                                                             |
| title<mark style="color:red;">\*</mark>       | The title of the extension that is shown to the user in the Store as well as the preferences. Use this title to describe your extension well that users can find it in the Store.                                                                   |
| description<mark style="color:red;">\*</mark> | The full description of the extension shown in the Store.                                                                                                                                                                                           |
| icon<mark style="color:red;">\*</mark>        | A reference to an icon file in the assets folder. Use png format with a size of 512 x 512 pixels. To support light and dark theme, add two icons, one with `@dark` as suffix, e.g. `icon.png` and `icon@dark.png`.                                  |
| author <mark style="color:red;">\*</mark>     | Your Raycast Store handle (username)                                                                                                                                                                                                                |
| categories<mark style="color:red;">\*</mark>  | An array of categories that your extension belongs in.                                                                                                                                                                                              |
| commands<mark style="color:red;">\*</mark>    | An array of [commands](./terminology.md#command) exposed by the extension, see [Command properties](manifest.md#command-properties).                                                                                                                |
| tools                                         | An array of tools that the AI can use to interact with this extension, see [Tool properties](#tool-properties).                                                                                                                                     |
| platforms                                     | An Array of platforms supported by the extension. If the extension uses some platform-specific APIs, add this field to restrict which platform can install it (`"macOS"` or `"Windows"`).                                                           |
| ai                                            | Additional information related to the AI capabilities of the extension, see [AI properties](#ai-properties).                                                                                                                                        |
| owner                                         | Used for extensions published under an organisation. When defined, the extension will be [private](../teams/getting-started.md) (except when specifying `access`).                                                                                  |
| access                                        | Either `"public"` or `"private"`. Public extensions are downloadable by anybody, while [private](../teams/getting-started.md) extensions can only be downloaded by a member of a given organization.                                                |
| contributors                                  | An array of Raycast store handles (usernames) of people who have meaningfully contributed and are maintaining to this extension.                                                                                                                    |
| pastContributors                              | An array of Raycast store handles (usernames) of people who have meaningfully contributed to the extension's commands but do not maintain it anymore.                                                                                               |
| keywords                                      | An array of keywords for which the extension can be searched for in the Store.                                                                                                                                                                      |
| preferences                                   | Extensions can contribute preferences that are shown in Raycast Preferences > Extensions. You can use preferences for configuration values and passwords or personal access tokens, see [Preference properties](manifest.md#preference-properties). |
| external                                      | An Array of package or file names that should be excluded from the build. The package will not be bundled, but the import is preserved and will be evaluated at runtime.                                                                            |

## Command properties

All properties for a [command](./terminology.md#command).

| Property                                      | Description                                                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name<mark style="color:red;">\*</mark>        | A unique id for the command. The name directly maps to the entry point file for the command. So a command named "index" would map to `src/index.ts` (or any other supported TypeScript or JavaScript file extension such as `.tsx`, `.js`, `.jsx`).                                                                                                                                                             |
| title<mark style="color:red;">\*</mark>       | The display name of the command, shown to the user in the Store, Preferences, and in Raycast's root search.                                                                                                                                                                                                                                                                                                     |
| subtitle                                      | The optional subtitle of the command in the root search. Usually, this is the service or domain that your command is associated with. You can dynamically update this property using [`updateCommandMetadata`](../api-reference/command.md#updatecommandmetadata).                                                                                                                                              |
| description<mark style="color:red;">\*</mark> | It helps users understand what the command does. It will be displayed in the Store and in Preferences.                                                                                                                                                                                                                                                                                                          |
| icon                                          | <p>An optional reference to an icon file in the assets folder. Use png format with a size of at least 512 x 512 pixels. To support light and dark theme, add two icons, one with <code>@dark</code> as suffix, e.g. <code>icon.png</code> and <code>icon@dark.png</code>.</p><p>If no icon is specified, the extension icon will be used.</p>                                                                   |
| mode<mark style="color:red;">\*</mark>        | A value of `view` indicates that the command will show a main view when performed. `no-view` means that the command does not push a view to the main navigation stack in Raycast. The latter is handy for directly opening a URL or other API functionalities that don't require a user interface. `menu-bar` indicates that this command will return a [Menu Bar Extra](../api-reference/menu-bar-commands.md) |
| interval                                      | The value specifies that a `no-view` or `menu-bar` command should be launched in the background every X seconds (s), minutes (m), hours (h) or days (d). Examples: 90s, 1m, 12h, 1d. The minimum value is 1 minute (1m).                                                                                                                                                                                        |
| keywords                                      | An optional array of keywords for which the command can be searched in Raycast.                                                                                                                                                                                                                                                                                                                                 |
| arguments                                     | An optional array of arguments that are requested from user when the command is called, see [Argument properties](manifest.md#argument-properties).                                                                                                                                                                                                                                                             |
| preferences                                   | Commands can optionally contribute preferences that are shown in Raycast Preferences > Extensions when selecting the command. You can use preferences for configuration values and passwords or personal access tokens, see [Preference properties](manifest.md#preference-properties). Commands automatically "inherit" extension preferences and can also override entries with the same `name`.              |
| disabledByDefault                             | <p>Specify whether the command should be enabled by default or not. By default, all commands are enabled but there are some cases where you might want to include additional commands and let the user enable them if they need it.</p><p><em>Note that this flag is only used when installing a new extension or when there is a new command.</em></p>                                                         |

## Preference properties

All properties for extension or command-specific preferences. Use the [Preferences API](../api-reference/preferences.md) to access their values.

| Property                                      | Description                                                                                                                                                                                                                                                                                                                                                                                |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name<mark style="color:red;">\*</mark>        | A unique id for the preference.                                                                                                                                                                                                                                                                                                                                                            |
| title<mark style="color:red;">\*</mark>       | <p>The display name of the preference shown in Raycast preferences.</p><p> For `"checkbox"`, `"textfield"` and `"password"`, it is shown as a section title above the respective input element.</p><p>If you want to group multiple checkboxes into a single section, set the <code>title</code> of the first checkbox and leave the <code>title</code> of the other checkboxes empty.</p> |
| description<mark style="color:red;">\*</mark> | It helps users understand what the preference does. It will be displayed as a tooltip when hovering over it.                                                                                                                                                                                                                                                                               |
| type<mark style="color:red;">\*</mark>        | The preference type. We currently support `"textfield"` and `"password"` (for secure entry), `"checkbox"`, `"dropdown"`, `"appPicker"`, `"file"`, and `"directory"`.                                                                                                                                                                                                                       |
| required<mark style="color:red;">\*</mark>    | Indicates whether the value is required and must be entered by the user before the extension is usable.                                                                                                                                                                                                                                                                                    |
| placeholder                                   | Text displayed in the preference's field when no value has been input.                                                                                                                                                                                                                                                                                                                     |
| default                                       | The optional default value for the field. For textfields, this is a string value; for checkboxes a boolean; for dropdowns the value of an object in the data array; for appPickers an application name, bundle ID or path.                                                                                                                                                                 |

Depending on the `type` of the Preference, some additional properties can be required:

### Additional properties for `checkbox` Preference

| Property                                | Description                                            |
| --------------------------------------- | ------------------------------------------------------ |
| label<mark style="color:red;">\*</mark> | The label of the checkbox. Shown next to the checkbox. |

### Additional properties for `dropdown` Preference

| Property                               | Description                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| data<mark style="color:red;">\*</mark> | An array of objects with `title` and `value` properties, e.g.: `[{"title": "Item 1", "value": "1"}]` |

## Argument properties

All properties for command arguments. Use the [Arguments API](./lifecycle/arguments.md) to access their values.

| Property                                      | Description                                                                                                                                                                                                                                      |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| name<mark style="color:red;">\*</mark>        | A unique id for the argument. This value will be used to as the key in the object passed as [top-level prop](./lifecycle/arguments.md#arguments).                                                                                                |
| type<mark style="color:red;">\*</mark>        | The argument type. We currently support `"text"`, `"password"` (for secure entry), and `"dropdown"`. When the type is `password`, entered text will be replaced with asterisks. Most common use case – passing passwords or secrets to commands. |
| placeholder<mark style="color:red;">\*</mark> | Placeholder for the argument's input field.                                                                                                                                                                                                      |
| required                                      | Indicates whether the value is required and must be entered by the user before the command is opened. Default value for this is `false`.                                                                                                         |

Depending on the `type` of the Argument, some additional properties can be required:

### Additional properties for `dropdown` Argument

| Property                               | Description                                                                                          |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| data<mark style="color:red;">\*</mark> | An array of objects with `title` and `value` properties, e.g.: `[{"title": "Item 1", "value": "1"}]` |

#### Tool Properties

All properties for a tool.

| Property                                      | Description                                                                                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| name<mark style="color:red;">\*</mark>        | A unique id for the tool. The name directly maps to the entry point file for the tool. So a tool named "index" would map to `src/tools/index.ts` (or any other supported TypeScript file extension such as `.tsx`).                                                                                                                           |
| title<mark style="color:red;">\*</mark>       | The display name of the tool, shown to the user in the Store and Preferences.                                                                                                                                                                                                                                                                 |
| description<mark style="color:red;">\*</mark> | It helps users and the AI understand what the tool does. It will be displayed in the Store and in Preferences.                                                                                                                                                                                                                                |
| icon                                          | <p>An optional reference to an icon file in the assets folder. Use png format with a size of at least 512 x 512 pixels. To support light and dark theme, add two icons, one with <code>@dark</code> as suffix, e.g. <code>icon.png</code> and <code>icon@dark.png</code>.</p><p>If no icon is specified, the extension icon will be used.</p> |

#### AI Properties

All properties for the AI capabilities of the extension. Alternatively, this object can be written in a `ai.json` (or `ai.yaml`) file at the root of the extension.

| Property     | Description                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| instructions | A string containing additional instructions for the AI. It will be added as a system message whenever the extension is mentioned. It can for example be used to help the AI respond with a format that makes more sense for the extension: `Always format pull requests and issues as markdown links: [pull-request-title](https://github.com/:org/:repo/pull/:number) and [issue-title](https://github.com/:org/:repo/issues/:number)` |
| evals        | Evals for AI Extension. [More details](https://raycastapp.notion.site/AI-Extensions-Evals-15fd6e4a8215800598cad77d8afb5dc8?pvs=73)                                                                                                                                                                                                                                                                                                      |
