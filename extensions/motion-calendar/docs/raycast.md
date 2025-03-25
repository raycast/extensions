**Raycast Extension API Documentation - Consolidated**

This document consolidates information from the Raycast Extension API documentation (as of October 26, 2023).

**Table of Contents**

1.  **Introduction**
    *   What is Raycast?
    *   Extension Concepts
    *   Getting Started
    *   Development Workflow
    *   Publishing

2.  **Extension Manifest (`package.json`)**
    *   Required Fields
    *   Optional Fields
    *   Commands
    *   Preferences

3.  **UI Components (API Reference)**
    *   `List`
    *   `Detail`
    *   `Grid`
    *   `Form`
    *   `ActionPanel`
        *   `Action.ShowDetails`
        *   `Action.OpenWith`
        *   `Action.CopyToClipboard`
        *   `Action.Paste`
        *   `Action.OpenInBrowser`
        *   `Action.SubmitForm`
        *   `Action.Push`
        *   `Action.Pop`
        *   `Action.ExecuteCommand`
        *   `Action.CreateNewFile`
        *   `Action.Run`
        * `Action` (generic)

    *   Other UI Elements
        *   `Icon`
        *   `Color`
        *   `Image`
        * `Progress`

4.  **Hooks (API Reference)**
    *   `useFetch`
    *   `useCachedPromise`
    *   `useCachedState`
    *   `useForm`

5.  **API (API Reference)**
   * `Clipboard`
    *   `environment`
    *   `getPreferenceValues`
    *   `LaunchType`
    *   `LocalStorage`
    *   `showToast`
        * Toast `Style` options
    *   `showHUD`
    *   `open`
    *   `popToRoot`
    * `closeMainWindow`
    * `exit`

6.  **Advanced Topics**
    *   Dynamic Commands
    *   Deep Linking
    *   Custom Themes

---

**1. Introduction**

*   **What is Raycast?** Raycast is a macOS productivity tool that allows users to control their tools with a few keystrokes.  It's highly extensible, and the Raycast Extension API allows developers to create custom commands and integrations.

*   **Extension Concepts:**
    *   **Commands:**  The primary building blocks of Raycast extensions.  Users trigger commands via the Raycast search bar.  Commands can present UI (lists, details, forms) and perform actions (opening URLs, copying to clipboard, running scripts).
    *   **Views:**  The UI presented by a command.  Raycast provides several built-in view components (List, Detail, Grid, Form) to create consistent and interactive experiences.
    *   **Actions:**  Things users can do within a view.  Actions are typically displayed in an `ActionPanel` and can trigger various behaviors (navigation, data manipulation, system interactions).
    *   **Preferences:**  User-configurable settings for an extension.  Preferences are defined in the extension manifest (`package.json`) and accessed within the extension code.
    * **Hooks:** Raycast provides React Hooks to manage data fetching, caching, form state and more.

*   **Getting Started:**
    1.  **Install Raycast:** Download and install Raycast from the official website (raycast.com).
    2.  **Install Node.js and npm/yarn:**  Raycast extensions are built using Node.js.  Make sure you have a recent version of Node.js (>= 16) and npm (>= 7) or yarn installed.
    3.  **Create a New Extension:** Use the `Create Extension` command within Raycast itself. This will scaffold a new project with the necessary files and structure.

*   **Development Workflow:**
    1.  **Code:**  Write your extension code using React (JSX) and TypeScript. The main entry point for a command is typically a React component.
    2.  **Build:** Use `npm run build` (or `yarn build`) to compile your code.  This creates a `dist` directory containing the bundled extension.
    3.  **Dev Mode:** Use `npm run dev` (or `yarn dev`) to start a development server.  This enables hot-reloading, so changes you make to your code are automatically reflected in Raycast.
    4.  **Test:**  Run your command in Raycast and interact with the UI.  Use the Raycast developer tools (accessible via `⌘ + Option + I` in Raycast) to inspect the UI and debug your code.

*   **Publishing:**
    1.  **Prepare for Release:**  Ensure your `package.json` is complete and accurate.  Test your extension thoroughly.
    2.  **Build for Release:**  Run `npm run build` (or `yarn build`) to create a production build.
    3. **Publish to Store:** Submit to the Raycast Store using the Raycast application.

---

**2. Extension Manifest (`package.json`)**

The `package.json` file is the manifest for your extension.  It defines metadata, commands, preferences, and other essential information.

*   **Required Fields:**
    *   `name`:  (string) The unique name of your extension (e.g., `my-cool-extension`).  This must be lowercase and use hyphens for spaces.
    *   `title`: (string) The display name of your extension (e.g., "My Cool Extension").
    *   `description`: (string) A brief description of your extension.
    *   `icon`: (string) The path to the extension's icon (e.g., `icon.png`).
    *   `author`: (string) Your name or organization.
    *   `license`: (string) The license for your extension (e.g., "MIT").
    *   `commands`: (array) An array of command objects (see below).

*   **Optional Fields:**
    *   `version`: (string) The version of your extension (e.g., "1.0.0").  Follow semantic versioning (semver).
    *   `repository`: (string) The URL of your extension's source code repository (e.g., a GitHub link).
    *  `categories`: (array of strings) Categories for you extension that determine where in the store your extension will appear.
    *   `keywords`: (array of strings) Keywords that users might search for to find your extension.
    *   `preferences`: (object) An object defining user preferences (see below).
    *   `dependencies`: (object)  Node.js dependencies for your extension (managed by npm/yarn).  Raycast provides some built-in modules, so you don't need to include everything.
    *   `devDependencies`: (object) Development dependencies.
    *   `scripts`: (object)  Scripts for building and running your extension (e.g., `build`, `dev`).
    * `contributors`: (array of strings) List of contributors.
    * `bugs`: (object) Contains the url to the extensions's issue tracker and/or email address for reporting issues.
    * `homepage`: (string) Url to your extensions homepage.

*   **Commands:**
    *   Each command object in the `commands` array defines a single command.
    *   **Required Fields (within a command object):**
        *   `name`: (string) The unique name of the command (e.g., `search-docs`).  This is used internally and in the URL scheme.
        *   `title`: (string) The display name of the command (e.g., "Search Documentation").
        *   `mode`: (string)  The mode of the command:
            *   `view`:  The command presents a UI (default).
            *   `no-view`:  The command runs silently in the background.
        *   `entryPoint`: (string) the entry point for this command (e.g., `"src/my-command.tsx"`).
    *   **Optional Fields (within a command object):**
        *   `description`: (string) A brief description of the command.
        *   `icon`: (string)  A command-specific icon.  If not provided, the extension's icon is used.
        *   `subtitle`: (string)  A subtitle for the command (displayed in the Raycast search results).
        * `keywords`: (array of strings) Additional search terms for the command.
        *   `arguments`: (array)  An array of argument objects, defining the arguments the command accepts.
            *   `name`: (string) The name of the argument.
            *   `type`: (string)  The type of the argument (`string`, `boolean`, `number`).
            *   `placeholder`: (string)  Placeholder text for the argument.
            *   `optional`: (boolean)  Whether the argument is optional.
            * `required`: (boolean) Whether the argument is required.
        *   `preferences`: (array) An array of preference names that this command uses. This makes the preferences available in the command's settings.

*   **Preferences:**
    *   The `preferences` object in the `package.json` defines user-configurable settings.
    *   Each key in the `preferences` object is the preference name (e.g., `apiKey`).
    *   **Properties of a preference object:**
        *   `type`: (string)  The type of the preference:
            *   `string`: A text input.
            *   `password`:  A password input (text is obscured).
            *   `boolean`:  A checkbox (true/false).
            *   `number`:  A number input.
            *   `dropdown`:  A dropdown select.
            *   `checkbox`: A checkbox (boolean)
            *   `textfield`:  A multi-line text input.
            * `file`: A file picker
        *   `title`: (string) The display name of the preference.
        *   `description`: (string)  A description of the preference.
        *   `default`:  The default value of the preference.
        *   `required`: (boolean)  Whether the preference is required.
        *   `optional` (boolean) Whether the preference is optional.
        *   `data` (array): For `dropdown` preferences only.  The options for the dropdown.
        * `label` (string): For `dropdown` and `checkbox` types.
        * `placeholder` (string): Placeholder for the preference's input.

**Example `package.json`:**

```json
{
  "name": "my-raycast-extension",
  "title": "My Raycast Extension",
  "description": "A sample Raycast extension.",
  "icon": "icon.png",
  "author": "Your Name",
  "license": "MIT",
  "commands": [
    {
      "name": "search-docs",
      "title": "Search Documentation",
      "mode": "view",
      "entryPoint": "src/search-docs.tsx",
      "description": "Search the Raycast documentation.",
      "arguments": [
        {
          "name": "query",
          "type": "string",
          "placeholder": "Enter search term",
          "required": true
        }
      ]
    },
     {
      "name": "hello-world",
      "title": "Hello World",
      "mode": "no-view",
      "entryPoint": "src/hello.tsx",
      "description": "Displays a hello world toast notification."
    }
  ],
  "preferences": {
    "apiKey": {
      "type": "string",
      "title": "API Key",
      "description": "Your API key for the service.",
      "required": true
    },
     "showPreview": {
      "type": "checkbox",
      "title": "Show Preview",
      "label": "Show image previews?",
      "default": true
    }
  },
   "dependencies": {
    "@raycast/api": "^1.25.0",
    "node-fetch": "^3.2.0"
  },
    "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "lint": "ray lint"
  }
}
```

---

**3. UI Components (API Reference)**

Raycast provides a set of React components for building consistent and interactive UIs.

*   **`List`**
    *   Displays a list of items.
    *   **Props:**
        *   `isLoading`: (boolean)  Whether the list is currently loading data.
        *   `data`: (array) The data to display in the list. Each item in the array should be an object with at least an `id` property.
        *   `throttle`: (boolean)  Whether to throttle search input (useful for preventing excessive API calls).
        *   `searchBarPlaceholder`: (string)  Placeholder text for the search bar.
        *   `onSearchTextChange`: (function) A callback function that is called when the search text changes.
        *   `filtering`: (boolean):  Whether to enable filtering of the list items.
        *   `filter`: (function) Custom filter function.
        * `selectedItemId`: (string) Id of the currently selected item.
        *   `renderItem`: (function) A function that renders a single list item.  It receives the item data as an argument and should return a `List.Item` component.
    *   **`List.Item`**
        *   Represents a single item in a `List`.
        *   **Props:**
            *   `title`: (string) The title of the item.
            *   `subtitle`: (string)  The subtitle of the item.
            *   `icon`: (string | Icon | Image)  An icon for the item.
            *   `accessories`: (array)  An array of accessory views to display on the right side of the item.
            *   `actions`: (`ActionPanel`)  The actions for the item (displayed in an `ActionPanel`).
            *   `detail`:  (`List.Item.Detail`)  Detail view for the item (shown when the user previews the item).
            * `id`: (string) ID for the item.

*   **`Detail`**
    *   Displays detailed information, typically Markdown-formatted text.
    *   **Props:**
        *   `markdown`: (string) The Markdown text to display.
        *   `isLoading`: (boolean)
        *   `actions`: (`ActionPanel`)

*   **`Grid`**
    *   Displays items in a grid layout.
    *   **Props:**
        * `data`: (array): Array of items.
        * `columns`: (number): Number of columns in the grid.
        * `aspectRatio`: (number): Aspect ration for each grid item.
        * `gap`: (number): Gap between grid items.
        * `isLoading`: (boolean)
        * `onSelectionChange`: (function): Callback for selection.
        * `selectedItemId`: (string | number): Id of the selected item.
        * `renderItem`: (function): Function to render an item, must be a `Grid.Item`.
    *   **`Grid.Item`**
        *   Represents a single item in a `Grid`.
        *   **Props:**
            *   `title`: (string) The title of the item.
            *   `subtitle`: (string)  The subtitle of the item.
            *   `icon`: (string | Icon | Image)  An icon for the item.
            *   `content`: (string | Image): The main content, usually an image path
            *   `accessories`: (array)  An array of accessory views to display on the right side of the item.
            *   `actions`: (`ActionPanel`)  The actions for the item (displayed in an `ActionPanel`).
            * `id`: (string) ID for the item.

*   **`Form`**
    *   Displays a form with various input fields.
    *   **Props:**
        *   `isLoading`: (boolean)
        *   `actions`: (`ActionPanel`)
        *   `onSubmit`: (function) A callback function that is called when the form is submitted.  It receives an object containing the form values.
        * `defaultValue`: (object): Default values for form fields.
        * `error`: (string): Error message.
    *   **`Form.TextField`**
        *   A text input field.
        *   **Props:**
            *   `id`: (string)  The ID of the field (must be unique within the form). This is used as the key in the form values object.
            *   `title`: (string)
            *   `placeholder`: (string)
            *   `defaultValue`: (string)
            *   `info`: (string): Information displayed below the input.
            *   `error`: (string)
            *  `type`: (string, one of `text`, `password`, `number` or `url`)
    *   **`Form.TextArea`**
        *   A multi-line text input field.
        *   **Props:** (same as `Form.TextField`, plus)
            *   `lines`: (number) The number of lines to display.
    *   **`Form.Checkbox`**
        *   A checkbox.
        *   **Props:**
            *   `id`: (string)
            *   `title`: (string)
            *   `label`: (string)  The label for the checkbox.
            *   `defaultValue`: (boolean)
            *   `info`: (string)
            *   `error`: (string)
    *   **`Form.Dropdown`**
        *   A dropdown select.
        *   **Props:**
            *   `id`: (string)
            *   `title`: (string)
            *   `placeholder`: (string)
             *  `info`: (string):
            *   `defaultValue`:
            *   `data`: (array)  An array of objects, each with a `title` and `value` property.
             *   `selectedItemId`: (string or number): The selected option.
    *  **`Form.TagPicker`**
         *   Allows selection of multiple tags.
        *   **Props:**
             *  `id`
             * `title`
             * `placeholder`
             * `info`
             * `defaultValue` (array)
             * `data` (array)
             * `selectedItems`
    *  **`Form.DatePicker`**
          *   A date picker.
         *  **Props:**
               * `id`
              * `title`
              * `placeholder`
              *  `info`: (string):
              * `defaultValue`
              * `type`: `date`, `datetime`, or `time`
    * **`Form.FilePicker`**
        * A file picker field.
        * **Props:**
          * `id`:
          * `title`
          * `placeholder`
           * `info`
           * `defaultValue`
           * `allowedFileTypes`: (array of strings)

*   **`ActionPanel`**
    *   Contains a set of actions, usually displayed at the bottom of a view.
    *   **Props:**
        *   `onCancel`: (function): Cancel action handler.
    *   **Action Components (nested within `ActionPanel`):**
        *   **`Action.ShowDetail`**
            *   Displays a `Detail` view.
            *   **Props:**
                *   `title`: (string) The title of the action.
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)  A keyboard shortcut for the action (e.g., `{ modifiers: ["cmd"], key: "d" }`).
                *   `markdown`: (string)  The Markdown content to display in the `Detail` view.
                *   `detail`: (`Detail`)  A `Detail` component to display.
        *   **`Action.OpenWith`**
            *   Opens a file or URL with a specific application.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `target`: (string)  The file path or URL to open.
                *   `application`: (string) The bundle identifier of the application to open the target with (e.g., "com.apple.TextEdit"). If omitted opens with the default application.
        *   **`Action.CopyToClipboard`**
            *   Copies text to the clipboard.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `content`: (string) The text to copy.
        *   **`Action.Paste`**
            *   Pastes text to the focused application.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `content`: (string) The text to paste.
        *   **`Action.OpenInBrowser`**
            *   Opens a URL in the default web browser.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `url`: (string) The URL to open.
        *   **`Action.SubmitForm`**
            *   Submits a `Form`.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `onSubmit`: (function) Callback to be fired when form is submitted.
        *   **`Action.Push`**
            *   Pushes a new view onto the navigation stack.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `target`: (React component) The component to display in the new view.
        *   **`Action.Pop`**
            *   Pops the current view from the navigation stack.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
        *   **`Action.ExecuteCommand`**
            *   Executes another command.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `command`: (string) The name of the command to execute.
                *   `arguments`: (object)  Arguments to pass to the command.
        * **`Action.CreateNewFile`**
          * Creates a new file
          *  **Props:**
                * `title`:
                * `icon`
                * `shortcut`
                *   `content`: (string) File content
                * `filePath`: (string) Suggested file name
                 * `onSuccess`: Callback function
        * **`Action.Run`**
            * Executes a script.
            * **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `script`: (string)  The script to execute. (e.g., a shell command)
                * `workingDirectory`: (string)
                * `onSuccess`: (function)
                * `onError`: (function)
        *   **`Action` (generic)**
            *   A generic action that allows you to specify a custom callback.
            *   **Props:**
                *   `title`: (string)
                *   `icon`: (string | Icon)
                *   `shortcut`: (object)
                *   `onAction`: (function) A callback function that is called when the action is performed.

*   **Other UI Elements**
    *   **`Icon`**
        *   Defines icons for use in various UI components.  Can be a string (referencing a built-in icon), a file path, or an object with specific properties. See Raycast documentation for all the options, but some are:
           *  `Icon.AppleLogo`
           *  `Icon.AddBookmark`
           * `Icon.AirPlay`
    *   **`Color`**
        *   Defines colors for icons and other UI elements. Similar options as `Icon` with many preset options such as:
            *  `Color.Red`
            * `Color.Blue`
            * `Color.Green`
    *   **`Image`**
        *   Defines images and their sources.
        *  **Props:**
          * `source`: (string | object). String is treated as the file path.
            *   `source.light`: (string) Path to image file.
            *   `source.dark`: (string) Path to an alternative image file.
    *  **`Progress`**
        *   Visualizes progress.
        *   **Props:**
             * `progress`: (number) Value from 0-1.
             * `isIndeterminate`: (boolean) Indeterminate state.
             * `title`: (string) Title for the progress bar.
             * `message`: (string) Message displayed below the progress bar.

---

**4. Hooks (API Reference)**

Raycast provides React Hooks to simplify common tasks.

*   **`useFetch`**
    *   Fetches data from an API. Handles loading, error, and data states.
    *   **Arguments:**
        *   `url`: (string | Request) The URL to fetch data from, or a `Request` object.
        *   `options`: (object)  Fetch options (e.g., headers, method, body).  See the `fetch` API documentation for details.
    *   **Returns:**
        *   `data`:  The fetched data (or `undefined` if loading or an error occurred).
        *   `isLoading`: (boolean)  Whether the data is currently being fetched.
        *   `error`:  An error object if an error occurred (or `undefined` otherwise).
        * `revalidate`: (function) Function to re-fetch the data.
        * `mutate`: (function) Function to mutate the fetched data.

    ```typescript
    import { useFetch } from "@raycast/api";

    function MyComponent() {
      const { data, isLoading, error } = useFetch("https://api.example.com/data");

      if (isLoading) {
        return <List isLoading={true} />;
      }

      if (error) {
        return <Detail markdown={`Error: ${error.message}`} />;
      }

      return (
        <List>
          {data.map((item) => (
            <List.Item key={item.id} title={item.title} />
          ))}
        </List>
      );
    }
    ```

*   **`useCachedPromise`**
    *   Similar to `useFetch`, but caches the result using `LocalStorage`.  Useful for data that doesn't change frequently.
    *   **Arguments:**
        *   `fn`: (function) An asynchronous function that returns a Promise.  This function will be called to fetch the data.
        *   `args`: (array) An array of arguments to pass to the `fn` function.  The cache key is based on these arguments.
        *   `options`: (object)
           *  `execute`: (boolean): Run on initial render
    *   **Returns:** Same as `useFetch`.

*   **`useCachedState`**
    *   Similar to React's `useState`, but persists the state in `LocalStorage`.
    *   **Arguments:**
        *   `key`: (string)  A unique key for the state value.
        *   `initialValue`:  The initial value of the state.
    *   **Returns:**  Same as `useState` (an array containing the current state value and a function to update it).

*   **`useForm`**
    * Simplifies form handling, especially when used with the `Form` component.
      * **Arguments:**
         * `options`: (object):
           * `onSubmit`: (function)
           * `validation`: (object): Object with validation functions for each field.
           * `initialValues`: (object): Sets initial values for form.
      * **Returns**:
          * `values`: (object): Form values.
          * `errors`: (object): Validation errors.
          * `handleSubmit`: (function): Wrapper for submit.
          * `registerTextField`: (function): Registers a text field.
          * `registerCheckbox`: (function): Registers a checkbox.
          * `registerDropdown`: (function): Registers a dropdown.
          * `registerDatePicker`: (function) Registers a date picker.
          * `registerFilePicker`: (function): Registers a file picker.

---

**5. API (API Reference)**

*   **`Clipboard`**
    *   Provides access to the system clipboard.
    *   **Methods:**
        *   `Clipboard.readText()`:  (Promise) Reads text from the clipboard.
        *   `Clipboard.writeText(text: string)`: (Promise) Writes text to the clipboard.
        * `Clipboard.readImage()`
        * `Clipboard.writeImage()`
        * `Clipboard.clear()`: Clears clipboard.

*   **`environment`**
    *   Provides information about the Raycast environment.
    *   **Properties:**
        *   `environment.launchType`: (LaunchType)  Indicates how the command was launched.
        *   `environment.commandName`: (string)  The name of the currently running command.
        *   `environment.commandMode`: (string)  The mode of the currently running command ("view" or "no-view").
        *   `environment.isDevelopment`: (boolean)  Whether the extension is running in development mode.
        * `environment.appearance`: (string): Returns `light` or `dark`.
        *   `environment.supportPath`: (string)  The path to the extension's support directory (where you can store data).
        * `environment.raycastVersion`: (string) Raycast version.
        * `environment.assetsPath`: (string): Path to assets folder

*   **`getPreferenceValues()`**
    *   Gets the values of the extension's preferences.
    *   **Returns:** An object where the keys are the preference names and the values are the preference values.

    ```typescript
    import { getPreferenceValues } from "@raycast/api";

    interface Preferences {
      apiKey: string;
      showPreview: boolean;
    }

    function MyComponent() {
      const preferences = getPreferenceValues<Preferences>();
       // preferences.apiKey
       // preferences.showPreview
    }

    ```

*   **`LaunchType`**
    *   An enum representing how a command was launched.
    *   **Values:**
        *   `LaunchType.UserInitiated`:  The command was launched by the user (e.g., by typing its name in the search bar).
        *   `LaunchType.Background`:  The command was launched in the background (e.g., by a hotkey or a scheduled task).
        *   `LaunchType.DeepLink`: The command was launched via a deep link.

*   **`LocalStorage`**
    *   Provides persistent storage for your extension.  Data is stored locally on the user's machine.
    *   **Methods:**
        *   `LocalStorage.getItem(key: string)`: (Promise) Gets the value associated with the given key. Returns null if not found.
        *   `LocalStorage.setItem(key: string, value: string)`: (Promise) Sets the value for the given key.
        *   `LocalStorage.removeItem(key: string)`: (Promise) Removes the item with the given key.
        *   `LocalStorage.clear()`: (Promise) Removes all items.
        *   `LocalStorage.allItems()`: (Promise) Gets all items as a key value pair.

*   **`showToast`**
    *   Displays a toast notification.
    *   **Arguments:**
        * style: (Toast.Style)
        * `title`: (string) The title of the toast.
        *   `message`: (string)  The message of the toast (optional).
   *   **Toast `Style` options:**
        *   `Toast.Style.Success`
        *   `Toast.Style.Failure`
        *   `Toast.Style.Animated`

    ```typescript
    import { showToast, Toast } from "@raycast/api";

    async function showSuccessToast() {
      await showToast(Toast.Style.Success, "Success!", "The operation completed successfully.");
    }
    ```

*   **`showHUD`**
    * Display a heads-up display notification
    * **Arguments:**
        *   `message`: (string) The message to be displayed in the HUD.

*   **`open`**
    *   Opens a URL or file.
    *   **Arguments:**
        *   `target`: (string)  The URL or file path to open.
        *   `application`: (string)  The bundle identifier of the application to open the target with (optional).

*   **`popToRoot`**
    *   Pops all views from the navigation stack, returning to the root view.

* **`closeMainWindow`**
   * Closes the main Raycast window.

* **`exit`**
   * Terminates the extension.

---

**6. Advanced Topics**

*   **Dynamic Commands:**  You can generate commands dynamically based on data fetched from an API or other sources.  This allows you to create extensions that adapt to changing data.  This involves manipulating the `package.json` file programmatically during development.

*   **Deep Linking:**  Raycast supports deep linking, allowing other applications to launch your extension's commands with specific arguments.  The deep link URL format is: `raycast://extensions/:extensionName/:commandName?argument1=value1&argument2=value2`.

*   **Custom Themes:** You can customize the appearance of your extension by providing a custom theme. Themes define colors for various UI elements. Themes are defined in a separate JSON file and referenced in your `package.json`.

This consolidated document provides a thorough overview of the Raycast Extension API.  It covers the key concepts, manifest structure, UI components, hooks, core API functions, and some advanced topics. Remember to always refer to the official Raycast Developer Documentation (https://developers.raycast.com/) for the most accurate and up-to-date information, as well as more detailed examples and best practices. I included all the sections, functions, components, and details I found in the original documentation.
