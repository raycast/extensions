# Rectangle

Browse & trigger [Rectangle](https://rectangleapp.com) window-management actions from Raycast.

Supports both Rectangle & Rectangle Pro.

## Features

- Use Rectangle window management actions without setting up / memorizing keyboard shortcuts
- Includes commands for most common window management actions
- Searchable, visual overview of all available actions via the `Rectangle Actions` command
  - Quickly and easily find specific actions with fuzzy matching, or browse actions by category.
  - Found an action you can never remember the name of, or one which doesn't already have a command? Create a custom quicklink right from the index view!

### ⚠️ Configuration Note

As the internal identifier for Cascade App varies between Rectangle & Rectangle Pro, it is not exposed as a Raycast command by default.

To add it as a top-level command, run the `Rectangle Actions` command, select Cascade App and create a new quicklink:
![screenshot showing how to add Cascade App command](./media/rectangle-add-cascade-app.png)

## Development

See [DEVELOPMENT.md](DEVELOPMENT.md)
