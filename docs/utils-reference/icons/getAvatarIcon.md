# `getAvatarIcon`

Icon to represent an avatar when you don't have one. The generated avatar will be generated from the initials of the name and have a colorful but consistent background.

![Avatar Icon example](../../.gitbook/assets/utils-avatar-icon.png)

## Signature

```ts
function getAvatarIcon(
  name: string,
  options?: {
    background?: string;
    gradient?: boolean;
  },
): Image.Asset;
```

- `name` is a string of the subject's name.
- `options.background` is a hexadecimal representation of a color to be used as the background color. By default, the hook will pick a random but consistent (eg. the same name will the same color) color from a set handpicked to nicely match Raycast.
- `options.gradient` is a boolean to choose whether the background should have a slight gradient or not. By default, it will.

Returns an [Image.Asset](../../api-reference/user-interface/icons-and-images.md) that can be used where Raycast expects them.

## Example

```tsx
import { List } from "@raycast/api";
import { getAvatarIcon } from "@raycast/utils";

export default function Command() {
  return (
    <List>
      <List.Item icon={getAvatarIcon("John Doe")} title="John Doe" />
    </List>
  );
}
```
