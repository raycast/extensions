# System Utilities

This set of utilities exposes some of Raycast's native functionality to allow deep integration into the user's setup. For example, you can use the Application APIs to check if a desktop application is installed and then provide an action to deep-link into it.

## API Reference

### getApplications

Returns all applications that can open the file.

#### Signature

```typescript
async function getApplications(path?: PathLike): Promise<Application[]>;
```

#### Example

```typescript
import { getApplications } from "@raycast/api";

export default async function Command() {
  const installedApplications = await getApplications();
  console.log("The following applications are installed on your Mac:");
  console.log(installedApplications.map((a) => a.name).join(", "));
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| path | The path of the file or folder to get the applications for. If no path is specified, all installed applications are returned. | <code>[PathLike](utilities.md#pathlike)</code> |

#### Return

An array of [Application](#application).

### getDefaultApplication

Returns the default application that the file would be opened with.

#### Signature

```typescript
async function getDefaultApplication(path: PathLike): Promise<Application>;
```

#### Example

```typescript
import { getDefaultApplication } from "@raycast/api";

export default async function Command() {
  const defaultApplication = await getDefaultApplication(__filename);
  console.log(`Default application for JavaScript is: ${defaultApplication.name}`);
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| path<mark style="color:red;">*</mark> | The path of the file or folder to get the default application for. | <code>[PathLike](utilities.md#pathlike)</code> |

#### Return

A Promise that resolves with the default [Application](#application) that would open the file. If no application was found, the promise will be rejected.

### getFrontmostApplication

Returns the frontmost application.

#### Signature

```typescript
async function getFrontmostApplication(): Promise<Application>;
```

#### Example

```typescript
import { getFrontmostApplication } from "@raycast/api";

export default async function Command() => {
  const defaultApplication = await getFrontmostApplication();
  console.log(`The frontmost application is: ${frontmostApplication.name}`);
};
```

#### Return

A Promise that resolves with the frontmost [Application](#application). If no application was found, the promise will be rejected.

### showInFinder

Shows a file or directory in the Finder.

#### Signature

```typescript
async function showInFinder(path: PathLike): Promise<void>;
```

#### Example

```typescript
import { showInFinder } from "@raycast/api";
import { homedir } from "os";
import { join } from "path";

export default async function Command() {
  await showInFinder(join(homedir(), "Downloads"));
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| path<mark style="color:red;">*</mark> | The path to show in the Finder. | <code>[PathLike](utilities.md#pathlike)</code> |

#### Return

A Promise that resolves when the item is revealed in the Finder.

### trash

Moves a file or directory to the Trash.

#### Signature

```typescript
async function trash(path: PathLike | PathLike[]): Promise<void>;
```

#### Example

```typescript
import { trash } from "@raycast/api";
import { writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";

export default async function Command() {
  const file = join(homedir(), "Desktop", "yolo.txt");
  await writeFile(file, "I will be deleted soon!");
  await trash(file);
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| path<mark style="color:red;">*</mark> |  | <code>[PathLike](utilities.md#pathlike)</code> or <code>[PathLike](utilities.md#pathlike)[]</code> |

#### Return

A Promise that resolves when all files are moved to the trash.

### open

Opens a target with the default application or specified application.

#### Signature

```typescript
async function open(target: string, application?: Application | string): Promise<void>;
```

#### Example

```typescript
import { open } from "@raycast/api";

export default async function Command() {
  await open("https://www.raycast.com", "com.google.Chrome");
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| target<mark style="color:red;">*</mark> | The file, folder or URL to open. | <code>string</code> |
| application | The application name to use for opening the file. If no application is specified, the default application as determined by the system is used to open the specified file. Note that you can use the application name, app identifier, or absolute path to the app. | <code>string</code> or <code>[Application](utilities.md#application)</code> |

#### Return

A Promise that resolves when the target has been opened.

## Types

### Application

An object that represents a locally installed application on the system.

It can be used to open files or folders in a specific application. Use [getApplications](#getapplications) or
[getDefaultApplication](#getdefaultapplication) to get applications that can open a specific file or folder.

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| name<mark style="color:red;">*</mark> | The display name of the application. | <code>string</code> |
| path<mark style="color:red;">*</mark> | The absolute path to the application bundle, e.g. `/Applications/Raycast.app`, | <code>string</code> |
| bundleId | The bundle identifier of the application, e.g. `com.raycast.macos`. | <code>string</code> |

### PathLike

```typescript
PathLike: string | Buffer | URL;
```

Supported path types.
