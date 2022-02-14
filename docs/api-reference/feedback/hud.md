# HUD

## API Reference

### showHUD

A HUD will automatically hide the main window and show a compact message at the bottom of the screen.

#### Signature

```typescript
async function showHUD(title: string): Promise<void>;
```

#### Example

```typescript
import { showHUD } from "@raycast/api";

export default async () => {
  await showHUD("Hey there 👋");
};
```

#### Parameters

| Name  | Type                | Required | Description                                   |
| :---- | :------------------ | :------- | :-------------------------------------------- |
| title | <code>string</code> | Yes      | The title that will be displayed for the HUD. |

#### Return

A Promise that resolves when the HUD is shown.
