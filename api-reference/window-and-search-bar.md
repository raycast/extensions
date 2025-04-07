# Raycast Window & Search Bar

## API Reference

### clearSearchBar

Clear the text in the search bar.

#### Signature

```typescript
async function clearSearchBar(options?: { forceScrollToTop?: boolean }): Promise<void>;
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| options | Can be used to control the behaviour after the search bar is cleared. | <code>Object</code> |
| options.forceScrollToTop | Can be used to force scrolling to the top. Defaults to scrolling to the top after the  the search bar was cleared. | <code>boolean</code> |

#### Return

A Promise that resolves when the search bar is cleared.

### closeMainWindow

Closes the main Raycast window.

#### Signature

```typescript
async function closeMainWindow(options?: { clearRootSearch?: boolean; popToRootType?: PopToRootType }): Promise<void>;
```

#### Example

```typescript
import { closeMainWindow } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default async function Command() {
  await setTimeout(1000);
  await closeMainWindow({ clearRootSearch: true });
}
```

You can use the `popToRootType` parameter to temporarily prevent Raycast from applying the user's "Pop to Root Search" preference in Raycast; for example, when you need to interact with an external system utility and then allow the user to return back to the view command:

```typescript
import { closeMainWindow, PopToRootType } from "@raycast/api";

export default async () => {
  await closeMainWindow({ popToRootType: PopToRootType.Suspended });
};
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| options | Can be used to control the behaviour after closing the main window. | <code>Object</code> |
| options.clearRootSearch | Clears the text in the root search bar and scrolls to the top | <code>boolean</code> |
| options.popToRootType | Defines the pop to root behavior (PopToRootType); the default is to to respect the user's "Pop to Root Search" preference in Raycast | <code>[PopToRootType](window-and-search-bar.md#poptoroottype)</code> |

#### Return

A Promise that resolves when the main window is closed.

### popToRoot

Pops the navigation stack back to root search.

#### Signature

```typescript
async function popToRoot(options?: { clearSearchBar?: boolean }): Promise<void>;
```

#### Example

```typescript
import { Detail, popToRoot } from "@raycast/api";
import { useEffect } from "react";
import { setTimeout } from "timers";

export default function Command() {
  useEffect(() => {
    setTimeout(() => {
      popToRoot({ clearSearchBar: true });
    }, 3000);
  }, []);

  return <Detail markdown="See you soon 👋" />;
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| options | Can be used to control the behaviour after going back to the root search. | <code>Object</code> |
| options.clearSearchBar |  | <code>boolean</code> |

#### Return

A Promise that resolves when Raycast popped to root.

## Types

### PopToRootType

Defines the pop to root behavior when the main window is closed.

#### Enumeration members

| Name      | Description                                                    |
| :-------- | :------------------------------------------------------------- |
| Default   | Respects the user's "Pop to Root Search" preference in Raycast |
| Immediate | Immediately pops back to root                                  |
| Suspended | Prevents Raycast from popping back to root                     |
