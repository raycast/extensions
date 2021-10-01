# Environment

## API Reference

### environment

```typescript
environment: Environment = ...
```

Contains environment values such as the Raycast version, extension info, and paths.

#### Example

```typescript
import { environment } from "@raycast/api";

console.log(`Raycast version: ${environment.raycastVersion}`);
console.log(`Extension name: ${environment.extensionName}`);
console.log(`Command name: ${environment.commandName}`);
console.log(`Assets path: ${environment.assetsPath}`);
console.log(`Support path: ${environment.supportPath}`);
console.log(`Is development mode: ${environment.isDevelopment}`);
```

### Environment

Holds data about the environment the command is running in.
Passed to a command on initialization.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| assetsPath | `string` | Yes | The absolute path to the assets directory of the extension. Use to load icons, images, and other packaged resources. |
| commandName | `string` | Yes | The name of the launched command, as specified in package.json |
| extensionName | `string` | Yes | The name of the extension, as specified in package.json |
| isDevelopment | `boolean` | Yes | Indicates whether the command is a development command (vs. an installed store command). |
| raycastVersion | `string` | Yes | The version of the main Raycast app |
| supportPath | `string` | Yes | The absolute path for the support directory of an extension. Use to read and write files for the extension. Note that the directory at this path might not physically exist already, so make sure to first create it. For instance using Node's fs module with the recursive option: |
