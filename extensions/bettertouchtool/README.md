# BetterTouchTool

Run [BTT](https://folivora.ai/) actions from Raycast using the official JavaScript client.

Enable the socket server in BetterTouchTool under **Settings → Scripting BTT → Command Line**. The extension falls back to BTT's webserver on port `64472`; update the extension preference if you use a different port. If you configured a shared secret in BTT, add the same secret to the extension preferences.

## Features

### Run BTT actions

Search the complete action catalog generated from BetterTouchTool's reference documentation. Actions with parameters open a generated form; nested configuration is entered as JSON.

### Named triggers

Find and run named triggers. The type of associated action will be displayed and in some cases you can hover over the action to see a preview of the code/file that will be executed.

Named triggers can optionally show their returned value in a toast or copy it to the clipboard. Configure this under the extension's **Named Trigger Results** preference.

### Variables

Search BTT's documented dynamic and context variables alongside your persistent user variables. Open a variable to load and copy its current value. Writable variables include a **Change Value** action.

BTT does not currently expose a scripting API that enumerates every live temporary variable, so the command reads persistent variable names from BTT's local variables file and supplements them with the documented standard-variable catalog. Use **Show All Variables in BTT** to open BTT's complete live view.

### Diagnostics

Inspect the active connection transport, BTT version, socket state, and available scripting capabilities.
