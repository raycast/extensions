# Manifest

The example below shows a manifest file for a simple Raycast command. 

```javascript
{
  "name": "raycast-example-react-helloworld",
  "title": "Raycast Examples",
  "description": "Raycast API example projects",
  "icon": "command-icon.png",
  "private": true,
  "commands": [
    {
      "name": "index",
      "title": "React Helloworld",
      "description": "Simple React Helloworld Example",
      "mode": "view"
    }
  ],
  "engines": {
    "raycast": ">=1.19.0"
  },
  "devDependencies": {},
  "dependencies": {
    "@raycast/api": "^0.1.17"
  }
}
```

#### Extension properties

| Property | Description |
| :--- | :--- |
| name | A unique name for the extension under your username handle. The name should be compatible with URLs \("slugified", lowercase with dashes\) since it can appear in store deeplinks. |
| title | The display name of the extension, shown to the user in Raycast. |
| description | The full description of the extension shown in the Raycast store. |
| icon | A reference to an icon file in the assets folder. We recommend the png format and a size of at least 128x128 pixels. |
| keywords | An optional array of keywords for which the extension can be searched in Raycast. |
| private | This is a standard property with a fix value of "true" so that npm installs do not generate license-related warnings. \(Officially this property means that packages are not published to the npm registry.\) |
| commands | An array of commands exposed by the extension, see [Command Properties](file:///Users/mann/Developer/api-alpha/documentation/index.html#command-properties). |
| engines | Expresses version compatibility with the Raycast API. For now, you do not need to modify this property or just match it to the current Raycast version. |
| preferences | Extensions can contribute preferences that are shown in Raycast Preferences &gt; Extensions when selecting the command. You can use preferences for configuration values and passwords or personal access tokens, see [Preference Properties](file:///Users/mann/Developer/api-alpha/documentation/index.html#preference-properties). |
| devDependencies | Standard npm property for declaring dependencies that are relevant for development only. |
| dependencies | Standard npm property for declaring dependencies that are bundled into the final compiled JavaScript entry point file for a command. In general, you can use all npm dependencies that run on Node.js and are compatible with standard JavaScript bundlers. Note that we currently do not support binary dependencies. |
| external | Optional array of package or file names that should be excluded from the build. The package will not be bundled but the import is preserved and will be evaluated at runtime. |

#### Command properties

| Property | Description |
| :--- | :--- |
| name | A unique name for the command. The name directly maps to the entry point file for the command. So a command named "index" would map to `index.ts` \(or any other supported TypeScript or JavaScript file extension such as `.tsx`, `.js`, `.jsx)`. |
| title | The display name of the command, shown to the user in Raycast. |
| description | The full description of the extension shown in the Raycast store. |
| icon | A optional reference to an icon file in the assets folder. We recommend the png format and a size of at least 128x128 pixels. If no icon is specified, the extension icon will be used. |
| mode | A value of `view` indicates that the command will show a main view when performed. `no-view` means that the command does not push a view to the main navigation stack in Raycast \(e.g., use it for directly opening a URL or other API functionality that does not require a user interface.\) |
| keywords | An optional array of keywords for which the command can be searched in Raycast. |
| preferences | Commands can optionally contribute preferences that are shown in Raycast Preferences &gt; Extensions when selecting the command. You can use preferences for configuration values and passwords or personal access tokens, see [Preference Properties](file:///Users/mann/Developer/api-alpha/documentation/index.html#preference-properties). Commands automatically "inherit" extension preferences and can also override entries with the same `name`. |

#### Preference properties

| Property | Description |
| :--- | :--- |
| name | A unique name for the preference. |
| type | The preference type. Currently we support type `textfield` and `password` \(for secure entry\). |
| required | Indicates whether the value is required and must be entered by the user before the extension is usable. |
| title | The display name of the preference, shown to the user in Raycast preferences. |
| description | The full description of the preference. This value may be shown in to the user in future Raycast versions. |
| placeholder | The optional placeholder text shown in the preference field. |
| link | An optional additional link to an external website. This value may be shown to the user in future Raycast versions. |
| default | The default value for the field. |

