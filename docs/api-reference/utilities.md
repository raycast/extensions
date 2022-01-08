# Utilities

This list of Utility APIs make your life easier as a developer. They also expose some of Raycast's native functionality to allow deep integration into the user's setup. For example, you can use the Application APIs to check if a desktop application is installed and then provide an action to deeplink into it.

## API Reference

### getApplications

Returns all applications that can open the file.

#### Signature

```typescript
async function getApplications(path: PathLike): Promise<Application[]>
```

#### Example

```typescript
import { getApplications } from "@raycast/api";

export default async () => {
  const installedApplications = await getApplications();
  console.log("The following applications are installed on your Mac:");
  console.log(installedApplications.map((a) => a.name).join(", "));
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| path | <code>PathLike</code> | No | The path of the file or folder to get the applications for. If no path is specified, all installed applications are returned. |

#### Return

An array of [Application](#application).

### getDefaultApplication

Returns the default application that the file would be opened with.

#### Signature

```typescript
async function getDefaultApplication(path: PathLike): Promise<Application>
```

#### Example

```typescript
import { getDefaultApplication } from "@raycast/api";

export default async () => {
  const defaultApplication = await getDefaultApplication(__filename);
  console.log(`Default application for JavaScript is: ${defaultApplication.name}`);
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| path | <code>PathLike</code> | Yes | The path of the file or folder to get the default application for. |

#### Return

The default [Application](#application) that would open the file. Throws an error if no application was found.

### randomId

Generate secure URL-friendly unique ID.

#### Signature

```typescript
function randomId(size: number): string
```

#### Example

```typescript
import { pasteText, randomId } from "@raycast/api";

export default async () => {
  const id = randomId();
  await pasteText(id);
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| size | <code>number</code> | No | Size of the ID. The default size is 21. |

#### Return

A random string.

### showInFinder

Shows a file or directory in the Finder.

#### Signature

```typescript
async function showInFinder(path: PathLike): Promise<void>
```

#### Example

```typescript
import { showInFinder } from "@raycast/api"
import { homedir } from "os"
showInFinder(homedir(), "Downloads")
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| path | <code>PathLike</code> | Yes | The path to show in the Finder. |

#### Return

A promise that resolves when item is revealed in the Finder.

### trash

Moves a file or director to the Trash.

#### Signature

```typescript
async function trash(path: PathLike | PathLike[]): Promise<void>
```

#### Example

```typescript
import { trash } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";

export default async () => {
  const file = `${homedir()}/Desktop/yolo.txt`;
  await writeFile(file, "I will be deleted soon!");
  await trash(file);
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| path | <code>PathLike</code> or <code>PathLike[]</code> | Yes |  |

#### Return

A promise that resolves when all files are moved to the trash.

### Application

An object that represents a locally installed application on the system.

It can be used to open files or folders in a specific application. Use [getApplications](#getapplications) or
[getDefaultApplication](#getdefaultapplication) to get applications that can open a specific file or folder.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| bundleId | <code>string</code> | No | The bundle identifier of the application, e.g. `com.raycast.macos`. |
| name | <code>string</code> | Yes | The display name of the application. |
| path | <code>string</code> | Yes | The absolute path to the application bundle, e.g. `/Applications/Raycast.app`, |
