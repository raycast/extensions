# Utilities

This list of Utility APIs makes your life easier as a developer. They also expose some of Raycast's native functionality to allow deep integration into the user's setup. For example, you can use the Application APIs to check if a desktop application is installed and then provide an action to deep-link into it.

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

export default async () => {
  const installedApplications = await getApplications();
  console.log("The following applications are installed on your Mac:");
  console.log(installedApplications.map((a) => a.name).join(", "));
};
```

#### Parameters

| Name | Type                               | Required | Description                                                                                                                   |
| :--- | :--------------------------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------- |
| path | <code>[PathLike](#pathlike)</code> | No       | The path of the file or folder to get the applications for. If no path is specified, all installed applications are returned. |

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

export default async () => {
  const defaultApplication = await getDefaultApplication(__filename);
  console.log(
    `Default application for JavaScript is: ${defaultApplication.name}`
  );
};
```

#### Parameters

| Name | Type                               | Required | Description                                                        |
| :--- | :--------------------------------- | :------- | :----------------------------------------------------------------- |
| path | <code>[PathLike](#pathlike)</code> | Yes      | The path of the file or folder to get the default application for. |

#### Return

The default [Application](#application) that would open the file. Throws an error if no application was found.

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

showInFinder(join(homedir(), "Downloads"));
```

#### Parameters

| Name | Type                               | Required | Description                     |
| :--- | :--------------------------------- | :------- | :------------------------------ |
| path | <code>[PathLike](#pathlike)</code> | Yes      | The path to show in the Finder. |

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

export default async () => {
  const file = join(homedir(), "Desktop", "yolo.txt");
  await writeFile(file, "I will be deleted soon!");
  await trash(file);
};
```

#### Parameters

| Name | Type                                                                       | Required | Description |
| :--- | :------------------------------------------------------------------------- | :------- | :---------- |
| path | <code>[PathLike](#pathlike)</code> or <code>[PathLike](#pathlike)[]</code> | Yes      |             |

#### Return

A Promise that resolves when all files are moved to the trash.

### open

Opens a target with the default application or specified application.

#### Signature

```typescript
async function open(
  target: string,
  application?: Application | string
): Promise<void>;
```

#### Example

```typescript
import { open } from "@raycast/api";

export default async () => {
  await open("https://www.raycast.com", "com.google.Chrome");
};
```

#### Parameters

| Name        | Type                                                            | Required | Description                                                                                                                                                                                                                                                        |
| :---------- | :-------------------------------------------------------------- | :------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| target      | <code>string</code>                                             | Yes      | The file, folder or URL to open                                                                                                                                                                                                                                    |
| application | <code>[Application](#application)</code> or <code>string</code> | No       | The application name to use for opening the file. If no application is specified, the default application as determined by the system is used to open the specified file. Note that you can use the application name, app identifier, or absolute path to the app. |

#### Return

A Promise that resolves when the target has been opened.

## Types

### Application

An object that represents a locally installed application on the system.

It can be used to open files or folders in a specific application. Use [getApplications](#getapplications) or
[getDefaultApplication](#getdefaultapplication) to get applications that can open a specific file or folder.

#### Properties

<InterfaceTableFromJSDoc name="Application" />

### PathLike

```typescript
PathLike: string | Buffer | URL;
```

Supported path types.
