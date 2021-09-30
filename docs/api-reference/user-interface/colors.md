# Colors

## API Reference

### Color

The standard colors. Use this colors for consistency.

The colors adopt to light and dark theme.

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
 return (
 <List>
   <List.Item title="Blue" icon={{ source: Icon.Circle, tintColor: Color.Blue }} />
   <List.Item title="Green" icon={{ source: Icon.Circle, tintColor: Color.Green }} />
   <List.Item title="Brown" icon={{ source: Icon.Circle, tintColor: Color.Brown }} />
   <List.Item title="Magenta" icon={{ source: Icon.Circle, tintColor: Color.Magenta }} />
   <List.Item title="Orange" icon={{ source: Icon.Circle, tintColor: Color.Orange }} />
   <List.Item title="Purple" icon={{ source: Icon.Circle, tintColor: Color.Purple }} />
   <List.Item title="Red" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
   <List.Item title="Yellow" icon={{ source: Icon.Circle, tintColor: Color.Yellow }} />
   <List.Item title="PrimaryText" icon={{ source: Icon.Circle, tintColor: Color.PrimaryText }} />
   <List.Item title="SecondaryText" icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }} />
 </List>
 );
};
```

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

Besides the [Color](../user-interface/colors.md#color), you can use any of the following color formats:
- HEX, e.g `#FF0000`
- Short HEX, e.g. `#F00`
- RGBA, e.g. `rgb(255, 0, 0)`
- RGBA Percentage, e.g. `rgb(255, 0, 0, 1.0)`
- HSL, e.g. `hsla(200, 20%, 33%, 0.2)`
- Keywords, e.g. `red`

Colors different to the built-in ones (see [Color](../user-interface/colors.md#color)) will be dynamically adjusted to fit the contrast.

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item title="Built-in color" icon={{ source: Icon.Circle, tintColor: Color.Red }} />
      <List.Item title="HEX" icon={{ source: Icon.Circle, tintColor: "#FF0000" }} />
      <List.Item title="Short HEX" icon={{ source: Icon.Circle, tintColor: "#F00" }} />
      <List.Item title="RGBA" icon={{ source: Icon.Circle, tintColor: "rgb(255, 0, 0)" }} />
      <List.Item title="RGBA Percentage" icon={{ source: Icon.Circle, tintColor: "rgb(255, 0, 0, 1.0)" }} />
      <List.Item title="HSL" icon={{ source: Icon.Circle, tintColor: "hsla(200, 20%, 33%, 0.2)" }} />
      <List.Item title="Keywords" icon={{ source: Icon.Circle, tintColor: "red" }} />
    </List>
  );
};
```
