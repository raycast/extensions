Great — I’ll review the Raycast extension documentation and distill the most relevant concepts, code patterns, and best practices into a concise developer-friendly guide and cheatsheet. This will be tailored specifically to support your Laravel Toolbox extension.

I’ll include structure, API usage, CLI tooling, component patterns, and practical examples that align with your project goals. I’ll update you once the document is ready.


# Raycast Extension Development – Laravel Toolkit Cheat Sheet

## Introduction to Raycast Extensions

Raycast extensions are plugins (built with TypeScript + React) that run inside the Raycast app, providing custom commands and UI in the Raycast command palette. Each extension is essentially a Node.js project with one or more **commands** that Raycast can execute. Raycast exposes an `@raycast/api` package, offering a rich API for UI components (lists, forms, etc.), user feedback (toasts, HUDs), and utilities. Extensions can run arbitrary Node.js code – for example, executing shell commands or reading files – enabling powerful integrations with development workflows.

**Key capabilities of Raycast extensions include:**

* **Custom Commands:** Define commands that appear in Raycast’s search palette (e.g. "Laravel: Migrate", "Laravel: Route List"). Each command is linked to a script (TypeScript/JavaScript) that runs when invoked.
* **Raycast UI Components:** Use built-in UI elements (List, Form, Detail, ActionPanel, etc.) to present data or prompt the user. Raycast handles input and navigation, so you focus on the logic.
* **System Integration:** Since extensions run on Node.js, you can call CLI tools (like `php artisan`), interact with the filesystem, or call APIs. This makes it possible to run Laravel Artisan commands, switch config files, tail logs, etc., directly from Raycast.
* **Quick Feedback:** Provide feedback via toasts, alerts or HUDs. For example, show a success or error toast after running a CLI command.
* **Local Development Ease:** Raycast offers a dev mode with hot-reloading, live logging, and error overlay for rapid development.

## Setting Up a New Extension

**Prerequisites:** Ensure you have Raycast (v1.26+), Node.js (v14+ or higher, e.g. Node 18/20) and npm available. Familiarity with TypeScript and React is recommended.

**1. Create the Extension Scaffold:**
Raycast provides a built-in “Create Extension” command (accessible via Raycast itself) or an npm initializer. The easiest way:

```bash
npx create-raycast-extension -t <template>
```

This CLI creates a new extension folder with a starter project. You can choose a template (e.g. `brand-guidelines`, `dashboard`, etc.) or start from a minimal template. For a simple starting point, the "blank" or "helloworld" template is useful. You will be prompted to enter the extension name (e.g. "Laravel Toolbox") and details.

**2. Install Dependencies:**
After scaffold, navigate into the project folder and run:

```bash
npm install && npm run dev
```

This installs `@raycast/api` and other deps, then starts the extension in **development mode**. In dev mode, Raycast will auto-import the extension and show it at the top of your Raycast search for quick access. You’ll see your extension’s name and commands listed in Raycast.

**3. Dev Mode Hot-Reloading:**
With `npm run dev` (which internally runs `npx ray develop`), any changes you make to source files will auto-reload in Raycast. This means you can edit a command, hit save, and then simply refocus Raycast to see the updated behavior. The dev console (your terminal running `npm run dev`) will show **logs** (`console.log` output) and any build errors. Raycast’s main window will indicate build status and show an overlay for runtime errors, aiding quick debugging. *Tip: use `console.log` liberally during development – logs appear in the dev terminal for easy debugging.*

**4. Opening and Using the Extension:**
In Raycast search, type your extension name or command name. Selecting the extension (or a specific command) will run it. In development, the extension remains installed even after stopping dev mode (you can find it under “Extensions” in Raycast). To remove a dev extension, use the "Manage Extensions" command in Raycast.

**CLI Commands Reference:** The Raycast CLI (part of `@raycast/api`) provides helpful commands to build, develop, lint, and publish extensions. Run `npx ray help` in the project for a full list. Common commands:

* `npx ray develop` – Run in development mode (hot reload, debug overlays, etc.).
* `npx ray lint` – Lint the extension code with ESLint.
* `npx ray build` – Create a production build (for publishing).
* `npx ray publish` – Build and publish to the Raycast store (requires Raycast login).

## Extension Structure and Manifest

A Raycast extension is structured like an npm package, with a **`package.json`** acting as the extension’s manifest. Key files and folders include:

```plaintext
my-extension/
├── src/             # Source TypeScript/JavaScript files for each command
│   └── <commandName>.tsx    # e.g. migrate.tsx, route-list.tsx, etc.
├── assets/          # Icons or other assets (optional)
│   └── icon.png     # Extension icon (512x512+, can provide light/dark variants)
├── package.json     # Manifest: extension metadata, commands list, dependencies
├── tsconfig.json    # TypeScript config
└── ... (eslint, prettier configs, node_modules, etc.)
```

**Source Files (`src/`):** Each Raycast command corresponds to one script file in `src`. The **file name** (without extension) must match the command’s `name` in the manifest. For example, in `package.json` if you have `"name": "migrate"` in the commands list, the code should reside in `src/migrate.tsx`. A minimal extension might have a single `src/index.tsx` for one command, but you can add multiple command files for different functionalities. We recommend using **TypeScript** (`.ts/.tsx`) for type safety and to leverage Raycast’s type definitions. Use `.tsx` for commands that render a React UI, and `.ts` for simple utility commands that might not render UI.

**Manifest (`package.json`):** Besides standard npm fields (name, version, author, etc.), Raycast uses additional fields in `package.json` to define extension metadata and commands. Important manifest fields:

* **`name`**: A unique internal identifier (no spaces) for your extension.

* **`title`**: Display name shown to users (e.g. "Laravel Toolbox").

* **`description`**: A short description of the extension’s purpose.

* **`icon`**: Path to the extension’s icon (usually `assets/icon.png`).

* **`author`** and **`license`**: Author name and license info.

* **`categories`**: An array of categories (from Raycast’s predefined list) to help users find it.

* **`commands`**: An array defining each command provided by the extension. For each command:

    * `name` – Unique ID (and script filename) for the command.
    * `title` – User-facing title (appears in Raycast search results and extension prefs).
    * `description` – Descriptive text shown in the store or settings.
    * `icon` – (Optional) icon for this command (overrides extension icon).
    * `mode` – Either `"view"` (default) or `"no-view"`. Use `"view"` for commands that present a UI (List, form, detail, etc.), and `"no-view"` for commands that perform a quick action without opening a new Raycast window. (There is also `"menu-bar"` for background menu bar items, not applicable here.) A `"no-view"` command is ideal for something like "Laravel: Migrate" which just runs a process and shows a toast. A `"view"` command is used when you need to display results or interact (e.g. "Laravel: Route List" showing a list of routes).
    * `keywords` – (Optional) extra keywords to help search for this command in Raycast.
    * `arguments` – (Optional) define input arguments that Raycast should prompt for when running the command. (Useful for quick text inputs; not required if your command handles input via React UI or extension preferences.)
    * `preferences` – (Optional) command-specific preferences, similar to extension preferences (see below).

* **`preferences`** (under the top-level manifest, not inside commands): You can define extension-wide **Preferences** that users can configure in Raycast’s settings. For example, a "Laravel Toolbox" might have a preference for "Default Laravel Project Path" or an API token. Each preference in the manifest has:

    * `name` – an internal key to retrieve the value in code.
    * `title` – label shown in the UI settings.
    * `description` – help text (shown as a tooltip in prefs).
    * `type` – one of `"textfield"`, `"password"`, `"checkbox"`, `"dropdown"`, `"appPicker"`, `"file"`, or `"directory"`. This defines what kind of input control is shown.
    * `default` – (Optional) default value (string for text, boolean for checkbox, etc.).
    * `required` – boolean, if true, Raycast will **require the user to set this preference** before running any command that uses it. Use this for critical config like API keys or paths.

Once preferences are defined in `package.json`, you can access them in code using the **Preferences API**. For example:

```ts
import { getPreferenceValues } from "@raycast/api";
const prefs = getPreferenceValues<{ projectPath: string }>();
console.log("User's configured project path:", prefs.projectPath);
```

This `getPreferenceValues` call returns an object with all your prefs (with correct types if you have an interface). You can then use `prefs.projectPath` (or whatever keys you defined) to customize your command’s behavior. Preferences are great for things like letting the user select their Laravel project directory, choose a default PHP binary, toggling features, etc.

## Raycast UI Components & APIs – Essentials

Raycast’s API (the `@raycast/api` library) provides React components and hooks to build UI quickly. Here are the core ones relevant to our Laravel Toolkit extension:

* **List:** The most common UI for Raycast extensions, ideal for displaying a list of items (e.g. routes, files, etc.). A `<List>` can contain multiple `<List.Item>`s, optional sections, and it comes with built-in search filtering by default. Each `List.Item` has a title, optional subtitle, icon, and can show additional metadata via accessories or a detailed view. For example, to display a list of routes with their method, URI, and name, you might put the method+URI in the title and the route name as subtitle, or use the accessory for method tag, etc.

  **Basic List Example:**

  ```tsx
  import { List, ActionPanel, Action } from "@raycast/api";
  const items = ["Item One", "Item Two", "Item Three"];
  export default function MyListCommand() {
    return (
      <List searchBarPlaceholder="Filter items...">
        {items.map((item) => (
          <List.Item 
            key={item}
            title={item}
            actions={
              <ActionPanel>
                <Action title="Select" onAction={() => console.log(item + " selected")} />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }
  ```

  In this example, Raycast automatically filters the list by item title as the user types. We attach an `ActionPanel` to each item, providing a "Select" action (which in this case just logs a message). In your Laravel routes list, you could populate `List.Item` from the output of `php artisan route:list`, and provide actions like “Copy route URL” or “Open in Browser” (if applicable) using Raycast’s built-in actions (more on ActionPanel below).

  *Filtering & Searching:* By default, `<List>` does fuzzy filtering on item titles/keywords. If you need custom filtering logic (e.g., filter by multiple fields), you can disable built-in filtering with `filtering={false}` and manage your own results based on `onSearchTextChange`. You can also add a search bar **dropdown menu** for additional filtering categories. For instance, a dropdown to switch between "all routes" and "api routes" could be implemented with `<List.Dropdown>` and updating the list accordingly.

* **ActionPanel & Actions:** Actions define what happens when the user selects an item or submits a form. Each `List.Item` (or other UI element) can have an associated `<ActionPanel>` with one or more `<Action>`s. Raycast provides many pre-built actions (imported from `@raycast/api`). Common ones include:

    * `Action.OpenInBrowser` – opens a URL in the default browser.
    * `Action.CopyToClipboard` – copy text to clipboard (you can give it a string or even file content).
    * `Action.Paste` – paste text into frontmost app.
    * `Action.Open` – open a file or path in default app.
    * `Action.ShowInFinder` – reveal a file in Finder.
    * ... and more (there are actions for emailing, terminal, etc., or you can define custom actions with any code via `onAction`).

  Actions can be grouped in sections within an ActionPanel for clarity. In our context, if we list routes, we might include an action to copy the route’s URL or name. For example:

  ```tsx
  <ActionPanel.Section title="Clipboard">
    <Action.CopyToClipboard content={route.url} title="Copy URL" />
    <Action.CopyToClipboard content={route.action} title="Copy Controller@Action" />
  </ActionPanel.Section>
  ```

  Another Action could run a follow-up Artisan command (like open route in browser if it’s local, etc.). You can also define an **Action hotkey** via the `shortcut` prop for quick access (e.g. `shortcut={{ modifiers: ["cmd"], key: "c" }}` for copy).

* **showToast and User Feedback:** When running background operations or long tasks, use `showToast()` to provide feedback. A toast is the small notification that appears at the top of Raycast. You can show info, success, or error toasts. For example:

  ```ts
  import { showToast, Toast } from "@raycast/api";
  await showToast({ style: Toast.Style.Animated, title: "Running migrations..." });
  // ... run some task ...
  await showToast({ style: Toast.Style.Success, title: "Migrations complete ✅" });
  ```

  The `Toast.Style` can be `.Animated` (shows a loading spinner), `.Success`, `.Failure`, or `.Info`. Include a `message` for a subtitle if needed. If you call `showToast` while Raycast is closed or in the background, it automatically falls back to a HUD notification on the desktop. This is great for quick heads-up messages (like “.env file switched”). There’s also `showHUD()` for an even more subtle heads-up display, and `showAlert()` for confirmation dialogs if needed (not usually necessary for simple tasks).

* **List Details and Metadata:** If an item needs more detailed info, you can use `<List.Item.Detail>` to show a rich detail view when the item is focused. This can include multiple lines of text, metadata columns, etc. For example, for a route item, you might want to show a multi-line detail with all route information (method, URI, controller, middleware). To use this, your `List` should be rendered in "split view" mode or push a new <Detail> view. Simpler approach: set the `detail` prop on `List.Item` to a `<List.Item.Detail>` element and include `isShowingDetail={true}` on the List, so that selecting the item shows the detail on the right side. Alternatively, for very simple info, you can put bits of data into the `accessories` prop of `List.Item` (an array of `{ icon?, text? }` objects that appear to the right of the item). Accessories are good for small labels like status or counts.

* **Form & Input:** Raycast also has a Form API (`<Form>` component) which is useful if you need to gather structured input from the user (like selecting from a dropdown, text input, etc. within a form). For example, a "Switch .env" command could be implemented as a form with a dropdown field listing available `.env` files, and on submit it renames files accordingly. A Form is typically a separate command (with `mode: "view"`) that yields an input UI. Given our scope, you might achieve the same by simply listing .env files in a List and using an action to activate one, so using Form is optional.

* **React Hooks for Async Data:** When your command needs to load data (e.g. reading a file, running a shell command, fetching an API), you should do this asynchronously so as not to block the UI. There are a few approaches:

    * Use **`useEffect`** with `useState`: initiate the async task in `useEffect` (on component mount or when some state changes), then store results in state. While loading, you can show a `<List isLoading={true}>` spinner. The Raycast Hacker News example uses `useEffect` to fetch RSS feed items, updates state, and uses `isLoading={!state.items}` to show a spinner until data is ready.

    * Use Raycast’s **`usePromise` or `useCachedPromise`**: these hooks simplify data loading by automatically handling loading state and caching. `usePromise` takes an async function and its dependencies, returning `{ isLoading, data, error }`. `useCachedPromise` does similar but caches results across reruns of the command.

    * Use **`useExec`** for running shell commands: Raycast provides a `useExec(command, args, options)` hook that runs a terminal command and gives you back the output or error state. This is perfect for calling `php artisan` or other CLI without manually managing `child_process`. For example:

      ```ts
      import { useExec } from "@raycast/api";
      const { isLoading, data, error } = useExec("php", ["artisan", "route:list"], { cwd: projectPath });
      ```

      Here `data` would contain the stdout (by default as a string) once the command completes. You could then parse this string to populate a List. The hook caches results so if you reopen the command, it might show cached data while refreshing in the background (stale-while-revalidate). You can force refresh by changing an argument or using the returned `revalidate` function.

    * Or use Node’s **`exec`/`spawn`** manually: As an alternative, you can call `import { exec } from "child_process"` and use `exec("php artisan ...", callback)` or the Promise-based approach with `promisify` as in the initial snippet. This gives you more control, but remember to handle errors and possibly large outputs (for very large outputs, consider using streams with `spawn` or limiting output).

  Regardless of method, always provide feedback during long operations (e.g. show a Toast with `Toast.Style.Animated` while a CLI runs) and handle errors gracefully (catch exceptions, maybe show a failure toast with `error.message` as done in the snippet). In dev mode, errors and stack traces will also show in the overlay and terminal for debugging.

## Practical Examples for Laravel Toolkit

Using the above tools, we can outline how to implement the specific features of **Laravel Toolbox**:

* **“Laravel: Migrate” Command (No-View):** This command runs `php artisan migrate` in the current Laravel project directory. In the manifest, set `"mode": "no-view"` since we don’t need to render a UI, just perform an action. The command’s script would use `exec` or `useExec` to call the Artisan command. For example:

  ```ts
  import { showToast, Toast } from "@raycast/api";
  import { exec } from "child_process";
  import { promisify } from "util";
  const execAsync = promisify(exec);

  export default async function Command() {
    await showToast({ style: Toast.Style.Animated, title: "Running Laravel migrations..." });
    try {
      const { stdout } = await execAsync("php artisan migrate", { cwd: "/path/to/project" });
      console.log(stdout);  // log output to Raycast dev console:contentReference[oaicite:80]{index=80} 
      await showToast({ style: Toast.Style.Success, title: "Migration complete" });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error(error);  // log the error for debugging
      await showToast({ style: Toast.Style.Failure, title: "Migration failed", message: error.message });
    }
  }
  ```

  This example shows an animated loading toast, runs the command, then shows success or failure toast. We use `console.log/error` which appear in dev mode logs. In a more advanced version, you might use `getPreferenceValues` to retrieve the project directory if it’s user-configurable, instead of hardcoding `cwd`.

* **“Laravel: Route List” Command (List View):** This command will likely be `"mode": "view"` since we want to display a list of routes in Raycast. The script could do the following: run `php artisan route:list --json` (Laravel can output routes as JSON if you use Artisan’s JSON options, or you parse the table output manually). Assume we can get an array of routes with fields (method, URI, name, etc.). We then use a `<List>` to display them. For instance:

  ```tsx
  import { List, ActionPanel, Action, Icon } from "@raycast/api";
  import { useExec } from "@raycast/api";
  import { useEffect, useState } from "react";

  interface Route { method: string; uri: string; name: string; /* ... */ }
  export default function RouteListCommand() {
    const [routes, setRoutes] = useState<Route[] | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const projectPath = "/path/to/project"; // or use prefs
    
    useEffect(() => {
      async function fetchRoutes() {
        try {
          // Example: using artisan with JSON output if available
          const { stdout } = await execAsync("php artisan route:list --format=json", { cwd: projectPath });
          const data = JSON.parse(stdout);
          setRoutes(data); 
        } catch (err) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
      fetchRoutes();
    }, []);
    
    if (error) {
      // If there's an error (e.g., artisan not found or JSON parse failed), show a List empty view or toast.
      // Show an error toast and an empty state in the list.
      showToast({ style: Toast.Style.Failure, title: "Failed to load routes", message: error.message });
    }
    
    return (
      <List isLoading={!routes && !error} searchBarPlaceholder="Filter routes by URI or name...">
        {routes?.map((route) => (
          <List.Item 
            key={route.uri + route.method}
            title={route.uri}
            subtitle={route.name || ""}
            accessories={[{ text: route.method }]}
            icon={Icon.Terminal}  // just an icon for demonstration
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy URI" content={route.uri} />
                {route.name && <Action.CopyToClipboard title="Copy Route Name" content={route.name} />}
                {/* Additional actions: open in browser, etc. if applicable */}
              </ActionPanel>
            }
          />
        ))}
        {(!routes || routes.length === 0) && !error && (
          <List.EmptyView title="No routes found" description="Run php artisan route:list to generate routes." />
        )}
      </List>
    );
  }
  ```

  In this pseudo-code, we manage state with `useEffect`. We show a loading spinner until `routes` is set. Each route is represented as a List.Item with the route URI as title, route name as subtitle, and HTTP method as an accessory (you might style method as badge text, or even use an icon for GET/POST if desired). We attach an ActionPanel with actions to copy info. We also include a `List.EmptyView` as a fallback if no routes are returned. Error handling is done by showing a toast and could also render an empty state.
  *Note:* For large output, using `useExec` hook with a parsing function might be cleaner. `useExec("php", ["artisan", "route:list", "--json"], { cwd, parseOutput: (stdout) => JSON.parse(stdout) })` could directly give you `data` as parsed JSON.

* **“Laravel: Switch .env File” Command:** There are a couple ways to implement this. One approach: use a **Form** with a dropdown field listing the available `.env` files in the project. Another approach: use a List to show `.env.example`, `.env.local`, etc., and on selecting one, perform the switch. For a quick interactive solution, a form might be nice:

  ```tsx
  import { Form, ActionPanel, Action, Icon } from "@raycast/api";
  import { useState } from "react";
  import { readdirSync, copyFileSync } from "fs";
  import { join } from "path";

  export default function EnvSwitcherCommand() {
    const projectPath = "/path/to/project";
    const envFiles = readdirSync(projectPath).filter(f => f.startsWith(".env"));
    const [selectedEnv, setSelectedEnv] = useState(".env");  // default to current .env
    
    const handleSubmit = () => {
      try {
        const backupPath = join(projectPath, ".env.backup");
        copyFileSync(join(projectPath, ".env"), backupPath);  // backup current
        copyFileSync(join(projectPath, selectedEnv), join(projectPath, ".env"));
        showToast({ style: Toast.Style.Success, title: `.env switched to ${selectedEnv}` });
      } catch (error) {
        showToast({ style: Toast.Style.Failure, title: "Switch failed", message: String(error) });
      }
    };
    
    return (
      <Form actions={<ActionPanel><Action.SubmitForm icon={Icon.ArrowClockwise} title="Switch .env" onSubmit={handleSubmit} /></ActionPanel>}>
        <Form.Dropdown id="envfile" title="Select .env file" value={selectedEnv} onChange={setSelectedEnv}>
          {envFiles.map(file => (
            <Form.Dropdown.Item key={file} value={file} title={file} />
          ))}
        </Form.Dropdown>
      </Form>
    );
  }
  ```

  This form command uses Node’s fs (`readdirSync`, `copyFileSync`) to list and switch files – permissible because the extension runs in a Node environment. We show a dropdown of all `.env*` files in the project directory, let the user choose one, and on submit, we backup the current `.env` then replace it. We use `showToast` to indicate success or failure. In manifest, ensure this command might require a preference for project path or otherwise know where to look. Alternatively, you might integrate a project locator that finds the nearest Laravel project (e.g., by looking for `artisan` file in parent dirs).

## Additional Tips & Best Practices

* **Finding the Project Directory:** If your extension should work in multiple Laravel projects, consider implementing a project locator (as mentioned in your plan). For instance, scanning parent directories for a `composer.json` or `artisan` file to identify the Laravel root. You can also allow the user to configure a list of project paths (perhaps via a JSON in preferences or by adding multiple commands each with a different env – though Raycast preferences might not natively support array inputs except perhaps via a textfield that you parse). A simple approach is to have a preference for "Laravel Project Path", which the user can set to the main project they work on. Use `getPreferenceValues` to retrieve it and use in your commands (for `cwd` or file operations).

* **Persistent Storage:** Raycast offers a simple key-value storage API (`LocalStorage`) if you need to store data between runs (e.g., caching last used .env, or a list of known project paths). Check out `@raycast/api`’s `LocalStorage` functions if needed. Also, `environment.supportPath` provides a folder path specific to your extension where you can save files if needed (like backup files, logs, etc.), instead of cluttering the project directory.

* **Security Considerations:** Extensions run with the same permissions as your user. Be cautious with handling secrets (Raycast preferences of type "password" are stored securely). Do not execute user input directly in shell commands without validation to avoid injection. The Raycast docs have a Security section if publishing publicly.

* **Testing Commands:** Use the Raycast developer’s **"Install Extension"** or **"Import Extension"** if you want to sideload your extension in Raycast outside of dev mode. You can also share your extension code with teammates by pushing to a repo and they can use "Import Extension" by pointing Raycast to the repository URL or local folder.

* **Publishing to Raycast Store:** If you plan to publish, follow the “Prepare for Store” guide – ensure you have a good README, proper categories, and icons. Raycast will run a build and some checks (`npx ray lint` and `npx ray build` should pass with no errors). For private/internal use (like within an organization), Raycast Teams allows publishing privately.

* **Performance:** Keep commands snappy. For expensive operations, consider using background tasks or streaming results. For instance, if listing routes is heavy, you might just fetch when needed or allow filtering before fetching all (Laravel’s route\:list can be slow on large apps). You could also mark the command with `refreshTime` (in manifest via the `interval` property) if you want Raycast to auto-refresh a no-view command periodically (not likely needed here).

* **Learn from Examples:** Check Raycast’s extension examples (like the Hacker News or Todo List examples on their docs) for patterns on list handling, error reporting, etc. The Hacker News example, for instance, demonstrates network fetch with loading and error toasts, list UI updates, and action panels for each item.

## Quick Reference Summary (Cheat Sheet)

* **Project Setup Commands:**

    * `npx create-raycast-extension -t <template>` – Scaffold a new extension (or use Raycast's "Create Extension" command).
    * `npm run dev` (alias for `npx ray develop`) – Launch dev mode (hot reload, logs, error overlay).
    * `npx ray lint` – Lint code with ESLint.
    * `npx ray build` – Build extension for production (outputs to `dist/`).
    * `npx ray publish` – Publish to store (must be logged in; for public or team store).

* **Manifest (`package.json`) Fields:**

    * **Extension:** `name`, `title`, `description`, `icon`, `author`, `categories`, `license`.
    * **Commands:** Each with `name` (maps to src filename), `title`, `description`, `mode` (`view` or `no-view`), `subtitle` (optional), `icon` (optional), `arguments` (optional array), `preferences` (optional per command).
    * **Preferences:** Define extension settings (in extension `preferences` or per command) with `name`, `title`, `description`, `type` (`textfield`, `password`, `checkbox`, `dropdown`, `file`, `directory`, etc.), `default` (optional), `required` (true/false). Access in code via `getPreferenceValues()`.

* **UI Components (from `@raycast/api`):**

    * `<List>` – Main list view; supports `searchBarPlaceholder`, built-in search filter (disable with `filtering={false}`), sections (`<List.Section>`), and even a search bar dropdown (`<List.Dropdown>`) for filtering categories. Use `isLoading` prop to show spinner while loading data.
    * `<List.Item>` – An item in the list. Props: `title`, `subtitle`, `icon`, `accessories` (array of icon/text for right side), `actions` (an `<ActionPanel>` element). For detailed content, use `detail={<List.Item.Detail ...>}` and set parent List’s `isShowingDetail`.
    * `<ActionPanel>` – Container for one or more actions for a list item or form. Can group actions with `<ActionPanel.Section title="...">`.
    * **Common Actions:** `Action.OpenInBrowser`, `Action.CopyToClipboard`, `Action.Paste`, `Action.Open (path)`, `Action.ShowInFinder`, `Action.Trash`, `Action.SendTo...` etc. Or define custom actions with `Action` and an `onAction` handler (execute code).
    * `<Form>` – Container for input fields, used for form-style commands. Common fields: `<Form.TextField>`, `<Form.PasswordField>`, `<Form.Checkbox>`, `<Form.Dropdown>` (with `<Form.Dropdown.Item>` options), `<Form.FilePicker>` / `<Form.DirectoryPicker>`, etc. Use a `<ActionPanel>` with `<Action.SubmitForm>` on the Form to handle submission.
    * `<Detail>` – For displaying a block of Markdown or text. Useful if you want to show readme or formatted output. Not specifically needed for Laravel Toolkit except if you want to show pretty-formatted details.

* **Feedback & Utilities:**

    * `showToast({ style, title, message })` – show a toast notification. Styles: `Toast.Style.Animated` (spinner), `Success`, `Failure`, `Info`.
    * `showHUD("text")` – quick heads-up overlay (no interaction, just shows text briefly).
    * `showAlert(options)` – open a modal dialog with confirm/cancel (for confirmations).
    * `Toast` object has methods like `Toast.show()` if you need to keep a toast open or update it. Simpler is to await `showToast` calls as above.
    * `console.log`, `console.error`, etc. – log to the dev console (terminal). Remember these don’t appear when the extension is in production (Raycast disables console logs for store extensions), so rely on toasts or other UI to communicate with users.

* **Node.js in Extensions:**

    * You can use Node.js standard modules like `fs`, `path`, `child_process` to interact with the system. For example, reading/writing files (`fs.readFileSync` etc.) or executing shell commands (`child_process.exec`). The environment is essentially Node, so most npm packages that don’t require Node GUI or a full Node runtime should work (note: no DOM, since this is not a browser environment).
    * The Node version is tied to Raycast’s runtime (Raycast recommends Node 14+; as of latest docs, Node 18 is supported). Check Raycast docs for any updates on Node version compatibility.

* **Development Tips:**

    * Use **Raycast Dev Toolkit**: Raycast has a VSCode extension for easier debugging (allows attaching a debugger to the Raycast process) – helpful for complex debugging.
    * **Reloading Extensions:** If changes aren’t reflecting, ensure `npm run dev` is still running. If something crashes, you might need to restart it. Also, Raycast Preferences > Extensions allows you to disable/enable your extension if needed to reset state.
    * **Auto-reload Toggle:** By default, dev mode auto-reloads on file save. This can be toggled in Raycast Preferences > Advanced ("Auto-reload on save"), but usually leave it on.
    * **Testing edge cases:** Test what happens if required preferences are not set (Raycast should prompt user in extension settings before running the command), test without network (if your extension fetches something), and large output handling (e.g., large route lists).

With this information, you should have both a high-level understanding and a quick reference to build the **Laravel Toolbox** Raycast extension. Leverage Raycast’s UI components to create a smooth developer experience, and utilize the power of Node/Artisan to automate Laravel tasks right from your Raycast launcher. Good luck with development! 🚀

**Sources:** Raycast Developer Documentation, Raycast API Reference and Examples.
