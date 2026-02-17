# Script Runner Extension

Run and search through custom automation scripts directly from Raycast.

## Features

- **Generic Script Execution**: Load JavaScript workflows from any directory.
- **Deep Linking**: Create Raycast Quicklinks to launch specific scripts instantly.
- **Custom Logging**: Debug scripts easily with built-in logging to `~/.iterm-tabs-extension.log`.

## Usage

1. **Install Extension**: Add this extension to Raycast.
2. **Configure Directory**: Point the extension to a folder containing your `.js` scripts.
3. **Run Scripts**: Open "Script Runner" to browse and execute your automation workflows.

## Script Format

Scripts must export a module with the following structure:

```javascript
module.exports = {
  name: "My Workflow",
  fetch: async () => {
    // Return an array of items
    return [{ name: "Item 1", value: "1" }, { name: "Item 2", value: "2" }];
  },
  doActions: async (item) => {
    // Perform action on selected item
    console.log("Selected:", item.name);
  }
};
```

## License

MIT
