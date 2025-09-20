# `getFavicon`

Icon showing the favicon of a website.

A favicon (favorite icon) is a tiny icon included along with a website, which is displayed in places like the browser's address bar, page tabs, and bookmarks menu.

![Favicon example](../../.gitbook/assets/utils-favicon.png)

## Signature

```ts
function getFavicon(
  url: string | URL,
  options?: {
    fallback?: Image.Fallback;
    size?: boolean;
    mask?: Image.Mask;
  },
): Image.ImageLike;
```

- `name` is a string of the subject's name.
- `options.fallback` is a [Image.Fallback](../../api-reference/user-interface/icons-and-images.md#image.fallback) icon in case the Favicon is not found. By default, the fallback will be `Icon.Link`.
- `options.size` is the size of the returned favicon. By default, it is 64 pixels.
- `options.mask` is the size of the [Image.Mask](../../api-reference/user-interface/icons-and-images.md#image.mask) to apply to the favicon.

Returns an [Image.ImageLike](../../api-reference/user-interface/icons-and-images.md) that can be used where Raycast expects them.

## Example

```tsx
import { List } from "@raycast/api";
import { getFavicon } from "@raycast/utils";

export default function Command() {
  return (
    <List>
      <List.Item icon={getFavicon("https://raycast.com")} title="Raycast Website" />
    </List>
  );
}
```
