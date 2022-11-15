# HUD

When the user takes an action that has the side effect of closing Raycast (for example when copying something in the [Clipboard](../clipboard.md)), you can use a HUD to confirm that the action worked properly.

![](../../.gitbook/assets/hud.png)

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

export default async function Command() {
  await showHUD("Hey there 👋");
}
```

#### Parameters

| Name | Description | Type |
| :--- | :--- | :--- |
| title<mark style="color:red;">*</mark> | The title that will be displayed in the HUD. | <code>string</code> |

#### Return

A Promise that resolves when the HUD is shown.
