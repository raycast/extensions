# BetterTouchTool

Run [BTT](https://folivora.ai/) actions from Raycast using the official JavaScript client.

Enable the socket server in BetterTouchTool under **Settings → Scripting BTT → Command Line**. The extension falls back to BTT's webserver on port `64472`; update the extension preference if you use a different port. If you configured a shared secret in BTT, add the same secret to the extension preferences.

## Features

### Run BTT actions

Search the complete action catalog generated from BetterTouchTool's reference documentation. Actions with parameters open a generated form; nested configuration is entered as JSON. Pin frequently used actions to the top with **⌘⇧P**.

### Named triggers

Find and run configured named triggers. The type of associated action will be displayed and in some cases you can hover over the action to see a preview of the code/file that will be executed. Named triggers can also be revealed in BetterTouchTool, enabled and disabled from Raycast, or pinned to the top with **⌘⇧P**.

Named triggers that declare text or number variables open a generated form before running. Variables with a defined set of options are shown as dropdowns. Named triggers can optionally show their returned value in a toast or copy it to the clipboard. Configure this under the extension's **Named Trigger Results** preference.

### All triggers

Browse configured gestures, keyboard shortcuts, automations, device buttons, groups, and other triggers by category. Triggers can be run, revealed in BetterTouchTool, enabled, or disabled without replacing the focused named-trigger command.

### Clipboard Manager

Search recent text items from BTT's Clipboard Manager, copy them, or paste them back into the previously focused app. This command uses BTT's own clipboard history and requires the Clipboard Manager to be enabled in BetterTouchTool.

### Variables

Search BTT's documented dynamic and context variables alongside your persistent user variables. Open a variable to load and copy its current value, or pin it to the top with **⌘⇧P**. Writable variables include an **Edit Value** action, and **Create New Variable** opens a typed form for creating persistent text or number variables.

BTT does not currently expose a scripting API that enumerates every live temporary variable, so the command reads persistent variable names from BTT's local variables file and supplements them with the documented standard-variable catalog. Use **Show All Variables in BTT** to open BTT's complete live view.

### Raycast AI

Mention `@bettertouchtool` in Quick AI or AI Chat to find and run named triggers, search and run built-in actions, or read and change variables. Raycast asks for confirmation before it runs an automation, executes an action, or changes a variable.

The AI tools search first and pass exact trigger UUIDs, action IDs, and catalog parameter names into mutating operations. String variable names and values are kept verbatim; number conversion only happens when a numeric type is explicitly requested.

Contributors can run the unit tests with `npm test`, build and validate the extension with `npm run build && npm run lint`, and run the Raycast AI eval suite with `npm run evals`.

### Diagnostics

When running the extension with `npm run dev`, choose **Show Connection Diagnostics** from any command's action panel to inspect the active transport, BTT version, socket state, and available scripting capabilities. This action is hidden in production builds.
