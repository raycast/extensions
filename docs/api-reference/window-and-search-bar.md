# Window & Search Bar

## API Reference

### clearSearchBar

Clear the text in the search bar.

#### Signature

```typescript
async function clearSearchBar(options: {
  forceScrollToTop: boolean;
}): Promise<void>;
```

#### Parameters

<FunctionParametersTableFromJSDoc name="clearSearchBar" />

#### Return

A Promise that resolves when the search bar is cleared.

### closeMainWindow

Closes the main Raycast window.

#### Signature

```typescript
async function closeMainWindow(options: {
  clearRootSearch: boolean;
}): Promise<void>;
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

<FunctionParametersTableFromJSDoc name="closeMainWindow" />

#### Return

A Promise that resolves when the main window is closed.

### openExtensionPreferences

Opens the extension's preferences screen.

#### Signature

```typescript
export declare function openExtensionPreferences(): Promise<void>;
```

#### Example

```typescript
import {
  ActionPanel,
  Action,
  Detail,
  openExtensionPreferences,
} from "@raycast/api";

export default function Command() {
  const markdown = `
API key incorrect. Please update it in extension preferences and try again.
  `;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openExtensionPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
```

#### Return

A Promise that resolves when the extensions preferences screen is opened.

### openCommandPreferences

Opens the command's preferences screen.

#### Signature

```typescript
export declare function openCommandPreferences(): Promise<void>;
```

#### Example

```typescript
import {
  ActionPanel,
  Action,
  Detail,
  openCommandPreferences,
} from "@raycast/api";

export default function Command() {
  const markdown = `
API key incorrect. Please update it in command preferences and try again.
  `;
  return (
    <Detail
      markdown={markdown}
      actions={
        <ActionPanel>
          <Action
            title="Open Extension Preferences"
            onAction={openCommandPreferences}
          />
        </ActionPanel>
      }
    />
  );
}
```

#### Return

A Promise that resolves when the command's preferences screen is opened.

### popToRoot

Pops the navigation stack back to root search.

#### Signature

```typescript
async function popToRoot(options: { clearSearchBar: boolean }): Promise<void>;
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

<FunctionParametersTableFromJSDoc name="popToRoot" />

#### Return

A Promise that resolves when Raycast popped to root.
