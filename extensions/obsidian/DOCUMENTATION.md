# Documentation

## Obsidian API

The Obsidian API can be found in the `src/obsidian` folder.

You can do the following imports

```ts
import { Obsidian, ObsidianUtils, Vault } from "../obsidian";
```

### Examples

Each import has a variety of helpful functions. For example

```ts
const vaults = Obsidian.getVaultsFromObsidianJson();
const vault = vaults[0];

const plugins = Vault.readCorePlugins();

Vault.writeMarkdown(
  "some/path",
  "some name",
  "some text",
  () => {
    console.log("creating path failed");
  },
  () => {
    console.log("creating file failed");
  }
);
```

### Contributing to the Obsidian API

The Obsidian API should not use any Raycast specific features. It should work as a standalone package to interface with the Obsidian app and the notes of vaults. Add functions to the `internal` folder of the API and only expose necessary methods in the public `index.ts` by either re-exporting them, adding them to the existing namespaces or creating new ones.

All functionality related to Raycast can be placed in the `api`, `components`, `utils`, `tools` folders.

## Raycast Commands

Raycast commands are stored in the root folder under `src/`. The commands should only be thin wrappers around the actual components. They load initial data, receive search arguments, parse preferences, etc. and forward all of that information into the component tree.

## Raycast API and Components

All Raycast related functionality that can't be included in the Obsidian API can be added to `src/api/` or `src/utils`.

## AI

The Obsidian extension supports Raycast AI commands. All tools that the AI Chat can access are stored in the `tools` folder and registered in `package.json`.
The system prompt can be found in `ai.json`.

### Contributing to AI

Tools should be as generic as possible. This will allow AI agents to perform more complex workflows by composing and chaining various tools.

If two tools seem to be doing similar things and the prompts are hard to keep apart, it is a good sign to merge the tools into a single one. The two beaviours can simply be modelled with an additional input parameter.
