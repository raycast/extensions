# `getProgressIcon`

Icon to represent the progress of a task, a project, _something_.

![Progress Icon example](../../.gitbook/assets/utils-progress-icon.png)

## Signature

```ts
function getProgressIcon(
  progress: number,
  color?: string,
  options?: {
    background?: string;
    backgroundOpacity?: number;
  }
): Image.Asset;
```

- `progress` is a number between 0 and 1 (0 meaning not started, 1 meaning finished).
- `color` is a hexadecimal representation of a color. By default it will be `"#FF6363"`.
- `options.background` is the color of the background of the progress icon. By default, it will be `white` if the Raycast theme is `dark`, and `black` if the Raycast theme is `light`.
- `options.backgroundOpacity` is the opacity of the background of the progress icon. By default, it will be `0.1`.

Returns an [Image.Asset](../../api-reference/user-interface/icons-and-images.md) that can be used where Raycast expects them.

## Example

```tsx
import { List } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";

export default function Command() {
  return (
    <List>
      <List.Item icon={getProgressIcon(0.1)} title="Project" />
    </List>
  );
}
```
