# Window & Search Bar

## API Reference

### clearSearchBar

Clear the text in the search bar.

#### Signature

```typescript
async function clearSearchBar(options: { forceScrollToTop: boolean }): Promise<void>
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| options | `{ forceScrollToTop: boolean }` | No | Can be used to force scrolling to the top. Defaults to scrolling to the top after the the search bar was cleared. |

#### Return

A promise that resolves when the search bar is cleared.

### closeMainWindow

Closes the main Raycast window.

#### Signature

```typescript
async function closeMainWindow(options: { clearRootSearch: boolean }): Promise<void>
```

#### Example

```typescript
import { closeMainWindow } from "@raycast/api";
import { setTimeout } from "timers/promises";

export default async () => {
  await setTimeout(1000);
  await closeMainWindow({ clearRootSearch: true });
};
```

#### Parameters

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| options | `{ clearRootSearch: boolean }` | No | Can be used to clear the root search. Defaults to not clearing the root search after the window was closed. |

#### Return

A promise that resolves when the main window is closed.

### popToRoot

Pops the navigation stack back to root search.

#### Signature

```typescript
async function popToRoot(options: { clearSearchBar: boolean }): Promise<void>
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

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| options | `{ clearSearchBar: boolean }` | No | Can be used to clear the search bar. Defaults to clearing the search bar after popped to root. |

#### Return

A promise that resolves when Raycast popped to root.
