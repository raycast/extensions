# Colors

## API Reference

### Color

The standard colors. Use this colors for consistency.

#### Enumeration members

| Name | Value |
| :--- | :--- |
| Blue | "raycast-blue" |
| Brown | "raycast-brown" |
| Green | "raycast-green" |
| Magenta | "raycast-magenta" |
| Orange | "raycast-orange" |
| PrimaryText | "raycast-primary-text" |
| Purple | "raycast-purple" |
| Red | "raycast-red" |
| SecondaryText | "raycast-secondary-text" |
| Yellow | "raycast-yellow" |

### ColorLike

```typescript
ColorLike: Color | string
```

Union type for the supported color types.

Besides the {@link Color}, you can use any of the following color formats:
- HEX, e.g `#FF0000`
- Short HEX, e.g. `#F00`
- RGBA, e.g. `rgb(255, 0, 0)`
- RGBA Percentage, e.g. `rgb(255, 0, 0, 1.0)`
- HSL, e.g. `hsla(200, 20%, 33%, 0.2)`
- Keywords, e.g. `red`

Colors different to the standard ones (see {@link Color}) will be dynamically adjusted to fit the contrast.
