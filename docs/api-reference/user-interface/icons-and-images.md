# Icons & Images

## API Reference

### FileIcon

An icon as it's used in the Finder.

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| fileIcon | `string` | Yes | The path to a file or folder to get it's icon from. |

### Image

Display different types of images, including network images or bundled assets.

#### Example

```typescript
// Built-in icon
const icon = Icon.Eye

// Built-in icon with tint color
const tintedIcon = { source: Icon.Bubble, tintColor: Color.Red }

// Bundled asset with circular mask
const avatar = { source: "avatar.png", mask: ImageMask.Circle }

// Theme-aware icon
const icon = { source: { light: "icon-light.png", dark: "icon-dark.png" }}
```

#### Properties

| Name | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| mask | `ImageMask` | No | A [ImageMask](../user-interface/icons-and-images.md#imagemask) to apply to the image. |
| source | `ImageSource` | Yes | The source of the image. |
| tintColor | `string` | No | A [ColorLike](../user-interface/colors.md#colorlike) to tint all the non-transparent pixels of the image. |

### Icon

List of built-in icons that can be used for actions or lists

#### Enumeration members

| Name | Value |
| :--- | :--- |
| ArrowClockwise | "arrow-clockwise-16" |
| ArrowRight | "arrow-right-16" |
| Binoculars | "binoculars-16" |
| Bubble | "bubble-left-16" |
| Calendar | "calendar-16" |
| Checkmark | "checkmark-circle-16" |
| ChevronDown | "chevron-down-16" |
| ChevronUp | "chevron-up-16" |
| Circle | "circle-16" |
| Clipboard | "doc-on-clipboard-16" |
| Clock | "clock-16" |
| Desktop | "desktopcomputer-16" |
| Document | "doc-16" |
| Dot | "dot-16" |
| Download | "square-and-arrow-down-16" |
| Envelope | "envelope-16" |
| ExclamationMark | "exclamation-mark-triangle-16" |
| Eye | "eye-16" |
| EyeSlash | "eye-slash-16" |
| Finder | "finder-16" |
| Gear | "gearshape-16" |
| Globe | "globe-16" |
| Hammer | "hammer-16" |
| LevelMeter | "level-meter-16" |
| Link | "link-16" |
| List | "main-list-view-16" |
| MagnifyingGlass | "magnifyingglass-16" |
| MemoryChip | "memorychip-16" |
| Message | "message-16" |
| Pencil | "pencil-16" |
| Person | "person-crop-circle-16" |
| Phone | "phone-16" |
| Pin | "pin-16" |
| Plus | "plus-16" |
| QuesionMark | "questionmark-circle-16" |
| Sidebar | "sidebar-right-16" |
| SpeakerArrowDown | "speaker-arrow-down-16" |
| SpeakerArrowUp | "speaker-arrow-up-16" |
| SpeakerSlash | "speaker-slash-16" |
| Star | "star-16" |
| Terminal | "terminal-16" |
| Text | "text-alignleft-16" |
| TextDocument | "doc-plaintext-16" |
| Trash | "trash-16" |
| Upload | "square-and-arrow-up-16" |
| Video | "video-16" |
| Window | "macwindow-16" |
| XmarkCircle | "xmark-circle-16" |

### ImageMask

Available masks that can be used to change the shape of an image.

#### Enumeration members

| Name | Value |
| :--- | :--- |
| Circle | "circle" |
| RoundedRectangle | "roundedRectangle" |

### ImageLike

```typescript
ImageLike: string | Icon | FileIcon | Image
```

Union type for the supported image types.

### ImageSource

```typescript
ImageSource: string | Icon | { dark: string; light: string }
```

The source of an [Image](../user-interface/icons-and-images.md#image). Can be either a remote URL, a local file resource, a built-in [Icon](../user-interface/icons-and-images.md#icon) or
a single emoji.
