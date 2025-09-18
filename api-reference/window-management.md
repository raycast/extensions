# Window Management

The Window Management API provides developers with some functions to create commands with some advanced logic to move [Window](#windowmanagement.window)s around.

{% hint style="info" %}

Some users might not have access to this API. If a user doesn't have access to Raycast Pro, they will be asked if they want to get access when your extension calls the Window Management API. If the user doesn't wish to get access, the API call will throw an error.

You can check if a user has access to the API using [`environment.canAccess(WindowManagement)`](./environment.md).

The API is not accessible on Windows for now.

{% endhint %}

## API Reference

### WindowManagement.getActiveWindow

Gets the active [Window](#windowmanagement.window).

#### Signature

```typescript
async function getActiveWindow(): Promise<Window>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default async function Command() {
  try {
    const window = await WindowManagement.getActiveWindow();
    if (window.positionable) {
      await WindowManagement.setWindowBounds({ id: window.id, bounds: { position: { x: 100 } } });
    }
  } catch (error) {
    showToast({ title: `Could not move window: ${error.message}`, style: Toast.Style.Failure });
  }
}
```

#### Return

A Promise that resolves with the active [Window](#windowmanagement.window). If no window is active, the promise will be rejected.

### WindowManagement.getWindowsOnActiveDesktop

Gets the list of [Window](#windowmanagement.window)s on the active [Desktop](#windowmanagement.desktop).

#### Signature

```typescript
async function getWindowsOnActiveDesktop(): Promise<Window[]>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default async function Command() {
  const windows = await WindowManagement.getWindowsOnActiveDesktop();
  const chrome = windows.find((x) => x.application?.bundleId === "com.google.Chrome");
  if (!chrome) {
    showToast({ title: "Couldn't find chrome", style: Toast.Style.Failure });
    return;
  }
  WindowManagement.setWindowBounds({ id: chrome.id, bounds: { position: { x: 100 } } });
}
```

#### Return

A Promise that resolves with an array of Windows.

### WindowManagement.getDesktops

Gets the list of [Desktop](#windowmanagement.desktop)s available across all screens.

#### Signature

```typescript
async function getDesktops(): Promise<Desktop[]>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default function Command() {
  const desktops = await WindowManagement.getDesktops();
  const screens = Set(desktops.map((desktop) => desktop.screenId));
  showToast({ title: `Found ${desktops.length} desktops on ${screens.size} screens.` });
}
```

#### Return

A Promise that resolves with the desktops.

### WindowManagement.setWindowBounds

Move a [Window](#windowmanagement.window) or make it fullscreen.

#### Signature

```typescript
async function setWindowBounds(
  options: { id: string } & (
    | {
        bounds: {
          position?: { x?: number; y?: number };
          size?: { width?: number; height?: number };
        };
        desktopId?: string;
      }
    | {
        bounds: "fullscreen";
      }
  )
): Promise<void>;
```

#### Example

```typescript
import { WindowManagement, showToast } from "@raycast/api";

export default async function Command() {
  try {
    const window = await WindowManagement.getActiveWindow();
    if (window.positionable) {
      await WindowManagement.setWindowBounds({ id: window.id, bounds: { position: { x: 100 } } });
    }
  } catch (error) {
    showToast({ title: `Could not move window: ${error.message}`, style: Toast.Style.Failure });
  }
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| options<mark style="color:red;">*</mark> |  | <code>{ id: string }</code> or <code>{ bounds: { position?: { x?: number; y?: number }; size?: { height?: number; width?: number } }; desktopId?: string }</code> or <code>{ bounds: "fullscreen" }</code> |

#### Return

A Promise that resolves with the window was moved. If the move isn't possible (for example trying to make a window fullscreen that doesn't support it), the promise will be rejected.

## Types

### WindowManagement.Window

A Window from an [Application](./utilities.md#application) on a [Desktop](#windowmanagement.desktop).

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| active<mark style="color:red;">*</mark> |  | <code>boolean</code> |
| bounds<mark style="color:red;">*</mark> |  | <code>{ position: { x: number; y: number }; size: { height: number; width: number } }</code> or <code>"fullscreen"</code> |
| desktopId<mark style="color:red;">*</mark> |  | <code>string</code> |
| fullScreenSettable<mark style="color:red;">*</mark> |  | <code>boolean</code> |
| id<mark style="color:red;">*</mark> |  | <code>string</code> |
| positionable<mark style="color:red;">*</mark> |  | <code>boolean</code> |
| resizable<mark style="color:red;">*</mark> |  | <code>boolean</code> |
| application |  | <code>[Application](utilities.md#application)</code> |

### WindowManagement.Desktop

A Desktop represents a virtual desktop on a Screen.

#### Properties

| Property | Description | Type |
| :--- | :--- | :--- |
| active<mark style="color:red;">*</mark> |  | <code>boolean</code> |
| id<mark style="color:red;">*</mark> |  | <code>string</code> |
| screenId<mark style="color:red;">*</mark> |  | <code>string</code> |
| size<mark style="color:red;">*</mark> |  | <code>{ height: number; width: number }</code> |
| type<mark style="color:red;">*</mark> |  | <code>[WindowManagement.DesktopType](window-management.md#windowmanagement.desktoptype)</code> |

### WindowManagement.DesktopType

The type of a [Desktop](#windowmanagement.desktop).

#### Enumeration members

| Name       | Description                                                                               |
| :--------- | :---------------------------------------------------------------------------------------- |
| User       | The default Desktop type. It can contain any number of [Window](#windowmanagement.window) |
| FullScreen | A Desktop made of a single fullscreen window                                              |
