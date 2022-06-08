# Icons & Images

## API Reference

### Icon

List of built-in icons that can be used for actions or list items.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Icon" icon={Icon.Circle} />
    </List>
  );
}
```

#### Enumeration members

| Name               | Image                                                            |
| :----------------- | :--------------------------------------------------------------- |
| ArrowClockwise     | ![](../../.gitbook/assets/icon-arrow-clockwise-16.png)           |
| TwoArrowsClockwise | ![](../../.gitbook/assets/icon-arrow-2-clockwise-16.png)         |
| ArrowRight         | ![](../../.gitbook/assets/icon-arrow-right-16.png)               |
| Binoculars         | ![](../../.gitbook/assets/icon-binoculars-16.png)                |
| Bubble             | ![](../../.gitbook/assets/icon-bubble-left-16.png)               |
| Calendar           | ![](../../.gitbook/assets/icon-calendar-16.png)                  |
| Checkmark          | ![](../../.gitbook/assets/icon-checkmark-circle-16.png)          |
| ChevronDown        | ![](../../.gitbook/assets/icon-chevron-down-16.png)              |
| ChevronUp          | ![](../../.gitbook/assets/icon-chevron-up-16.png)                |
| Circle             | ![](../../.gitbook/assets/icon-circle-16.png)                    |
| Clipboard          | ![](../../.gitbook/assets/icon-doc-on-clipboard-16.png)          |
| Clock              | ![](../../.gitbook/assets/icon-clock-16.png)                     |
| Desktop            | ![](../../.gitbook/assets/icon-desktopcomputer-16.png)           |
| Document           | ![](../../.gitbook/assets/icon-doc-16.png)                       |
| Dot                | ![](../../.gitbook/assets/icon-dot-16.png)                       |
| Download           | ![](../../.gitbook/assets/icon-square-and-arrow-down-16.png)     |
| Envelope           | ![](../../.gitbook/assets/icon-envelope-16.png)                  |
| ExclamationMark    | ![](../../.gitbook/assets/icon-exclamation-mark-triangle-16.png) |
| Eye                | ![](../../.gitbook/assets/icon-eye-16.png)                       |
| EyeSlash           | ![](../../.gitbook/assets/icon-eye-slash-16.png)                 |
| Finder             | ![](../../.gitbook/assets/icon-finder-16.png)                    |
| Gear               | ![](../../.gitbook/assets/icon-gearshape-16.png)                 |
| Globe              | ![](../../.gitbook/assets/icon-globe-16.png)                     |
| Hammer             | ![](../../.gitbook/assets/icon-hammer-16.png)                    |
| LevelMeter         | ![](../../.gitbook/assets/icon-level-meter-16.png)               |
| Link               | ![](../../.gitbook/assets/icon-link-16.png)                      |
| List               | ![](../../.gitbook/assets/icon-main-list-view-16.png)            |
| MagnifyingGlass    | ![](../../.gitbook/assets/icon-magnifyingglass-16.png)           |
| MemoryChip         | ![](../../.gitbook/assets/icon-memorychip-16.png)                |
| Message            | ![](../../.gitbook/assets/icon-message-16.png)                   |
| Pencil             | ![](../../.gitbook/assets/icon-pencil-16.png)                    |
| Person             | ![](../../.gitbook/assets/icon-person-crop-circle-16.png)        |
| Phone              | ![](../../.gitbook/assets/icon-phone-16.png)                     |
| Pin                | ![](../../.gitbook/assets/icon-pin-16.png)                       |
| Plus               | ![](../../.gitbook/assets/icon-plus-16.png)                      |
| QuestionMark       | ![](../../.gitbook/assets/icon-questionmark-circle-16.png)       |
| Sidebar            | ![](../../.gitbook/assets/icon-sidebar-right-16.png)             |
| SpeakerArrowDown   | ![](../../.gitbook/assets/icon-speaker-arrow-down-16.png)        |
| SpeakerArrowUp     | ![](../../.gitbook/assets/icon-speaker-arrow-up-16.png)          |
| SpeakerSlash       | ![](../../.gitbook/assets/icon-speaker-slash-16.png)             |
| Star               | ![](../../.gitbook/assets/icon-star-16.png)                      |
| Terminal           | ![](../../.gitbook/assets/icon-terminal-16.png)                  |
| Text               | ![](../../.gitbook/assets/icon-text-alignleft-16.png)            |
| TextDocument       | ![](../../.gitbook/assets/icon-doc-plaintext-16.png)             |
| Trash              | ![](../../.gitbook/assets/icon-trash-16.png)                     |
| Upload             | ![](../../.gitbook/assets/icon-square-and-arrow-up-16.png)       |
| Video              | ![](../../.gitbook/assets/icon-video-16.png)                     |
| Window             | ![](../../.gitbook/assets/icon-macwindow-16.png)                 |
| XmarkCircle        | ![](../../.gitbook/assets/icon-xmark-circle-16.png)              |

### Image.Mask

Available masks that can be used to change the shape of an image.

Can be handy to shape avatars or other items in a list.

#### Example

```typescript
import { Image, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Icon"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          mask: Image.Mask.Circle,
        }}
      />
    </List>
  );
}
```

#### Enumeration members

| Name             | Value              |
| :--------------- | :----------------- |
| Circle           | "circle"           |
| RoundedRectangle | "roundedRectangle" |

## Types

### Image

Display different types of images, including network images or bundled assets.

Apply image transforms to the source, such as a `mask` or a `tintColor`.

#### Example

```typescript
// Built-in icon
const icon = Icon.Eye;

// Built-in icon with tint color
const tintedIcon = { source: Icon.Bubble, tintColor: Color.Red };

// Bundled asset with circular mask
const avatar = { source: "avatar.png", mask: ImageMask.Circle };

// Theme-aware icon
const icon = { source: { light: "icon-light.png", dark: "icon-dark.png" } };
```

#### Properties

<InterfaceTableFromJSDoc name="Image" />

### FileIcon

An icon as it's used in the Finder.

#### Example

```typescript
import { List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="File icon" icon={{ fileIcon: __filename }} />
    </List>
  );
}
```

#### Properties

<InterfaceTableFromJSDoc name="FileIcon" />

### Image.ImageLike

```typescript
ImageLike: URL | Asset | Icon | FileIcon | Image;
```

Union type for the supported image types.

#### Example

```typescript
import { Icon, Image, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="URL" icon="https://raycast.com/uploads/avatar.png" />
      <List.Item title="Asset" icon="avatar.png" />
      <List.Item title="Icon" icon={Icon.Circle} />
      <List.Item title="FileIcon" icon={{ fileIcon: __filename }} />
      <List.Item
        title="Image"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          mask: Image.Mask.Circle,
        }}
      />
    </List>
  );
}
```

### Image.Source

```typescript
Image.Source: URL | Asset | Icon | { light: URL | Asset; dark: URL | Asset }
```

The source of an [Image](#image). Can be either a remote URL, a local file resource, a built-in [Icon](#icon) or
a single emoji.

For consistency, it's best to use the built-in [Icon](#icon) in lists, the Action Panel, and other places. If a
specific icon isn't built-in, you can reference custom ones from the `assets` folder of the extension by file name,
e.g. `my-icon.png`. Alternatively, you can reference an absolute HTTPS URL that points to an image or use an emoji.
You can also specify different remote or local assets for light and dark theme.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="URL"
        icon={{ source: "https://raycast.com/uploads/avatar.png" }}
      />
      <List.Item title="Asset" icon={{ source: "avatar.png" }} />
      <List.Item title="Icon" icon={{ source: Icon.Circle }} />
      <List.Item
        title="Theme"
        icon={{
          source: {
            light: "https://raycast.com/uploads/avatar.png",
            dark: "https://raycast.com/uploads/avatar.png",
          },
        }}
      />
    </List>
  );
}
```

### Image.Fallback

```typescript
Image.Fallback: Asset | Icon | { light: Asset; dark: Asset }
```

A fallback [Image](#image) that will be displayed in case the source image cannot be loaded. Can be either a local file resource, a built-in [Icon](#icon), a single emoji, or a theme-aware asset. Any specified `mask` or `tintColor` will also apply to the fallback image.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="URL Source With Asset Fallback"
        icon={{
          source: "https://raycast.com/uploads/avatar.png",
          fallback: "default-avatar.png",
        }}
      />
    </List>
  );
}
```

### Image.URL

Image is a string representing a URL.

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="URL"
        icon={{ source: "https://raycast.com/uploads/avatar.png" }}
      />
    </List>
  );
}
```

### Image.Asset

Image is a string representing an asset from the `assets/` folder

#### Example

```typescript
import { Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Asset" icon={{ source: "avatar.png" }} />
    </List>
  );
}
```
