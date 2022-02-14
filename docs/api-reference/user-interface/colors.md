# Colors

Anywhere you can pass a color in a component prop, you can pass either:

- A standard [Color](#color)
- A [Dynamic](#dynamic) Color
- A [Raw](#raw) Color

## API Reference

### Color

The standard colors. Use those colors for consistency.

The colors automatically adapt to the Raycast theme (light or dark).

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Blue"
        icon={{ source: Icon.Circle, tintColor: Color.Blue }}
      />
      <List.Item
        title="Green"
        icon={{ source: Icon.Circle, tintColor: Color.Green }}
      />
      <List.Item
        title="Brown"
        icon={{ source: Icon.Circle, tintColor: Color.Brown }}
      />
      <List.Item
        title="Magenta"
        icon={{ source: Icon.Circle, tintColor: Color.Magenta }}
      />
      <List.Item
        title="Orange"
        icon={{ source: Icon.Circle, tintColor: Color.Orange }}
      />
      <List.Item
        title="Purple"
        icon={{ source: Icon.Circle, tintColor: Color.Purple }}
      />
      <List.Item
        title="Red"
        icon={{ source: Icon.Circle, tintColor: Color.Red }}
      />
      <List.Item
        title="Yellow"
        icon={{ source: Icon.Circle, tintColor: Color.Yellow }}
      />
      <List.Item
        title="PrimaryText"
        icon={{ source: Icon.Circle, tintColor: Color.PrimaryText }}
      />
      <List.Item
        title="SecondaryText"
        icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
      />
    </List>
  );
}
```

#### Enumeration members

| Name          | Value                    |
| :------------ | :----------------------- |
| Blue          | "raycast-blue"           |
| Brown         | "raycast-brown"          |
| Green         | "raycast-green"          |
| Magenta       | "raycast-magenta"        |
| Orange        | "raycast-orange"         |
| PrimaryText   | "raycast-primary-text"   |
| Purple        | "raycast-purple"         |
| Red           | "raycast-red"            |
| SecondaryText | "raycast-secondary-text" |
| Yellow        | "raycast-yellow"         |

## Types

### ColorLike

```typescript
ColorLike: Color | Color.Dynamic | Color.Raw;
```

Union type for the supported color types.

When using a [Raw Color](#raw), it will be dynamically adjusted to achieve high contrast with the Raycast user interface.

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Built-in color"
        icon={{ source: Icon.Circle, tintColor: Color.Red }}
      />
      <List.Item
        title="Raw color"
        icon={{ source: Icon.Circle, tintColor: "#FF0000" }}
      />
      <List.Item
        title="Dynamic color"
        icon={{
          source: Icon.Circle,
          tintColor: {
            light: "#FF01FF",
            dark: "#FFFF50",
            adjustContrast: true,
          },
        }}
      />
    </List>
  );
}
```

### Dynamic

A dynamic color applies different colors depending on the active Raycast theme.

#### Example

```typescript
import { Color, Icon, List } from "@raycast/api";

export default function Command() {
  return (
    <List>
      <List.Item
        title="Dynamic Tint Color"
        icon={{
          source: Icon.Circle,
          tintColor: {
            light: "#FF01FF",
            dark: "#FFFF50",
            adjustContrast: true,
          },
        }}
      />
      <List.Item
        title="Dynamic Tint Color"
        icon={{
          source: Icon.Circle,
          tintColor: { light: "#FF01FF", dark: "#FFFF50" },
        }}
      />
    </List>
  );
}
```

#### Properties

| Name           | Type                 | Required | Description                                                                                                                                                                                                                                                                                                                               |
| :------------- | :------------------- | :------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| adjustContrast | <code>boolean</code> | No       | Enables dynamic contrast adjustment for light and dark theme color. Colors different to the built-in {@link Color} can be dynamically adjusted to achieve high contrast with the Raycast user interface. This makes it easy to guarantee a good look and feel when you aren't in control of the color, e.g. get it via a network request. |
| dark           | <code>string</code>  | Yes      | The color which is used in light theme.                                                                                                                                                                                                                                                                                                   |
| light          | <code>string</code>  | Yes      | The color which is used in light theme.                                                                                                                                                                                                                                                                                                   |

### Raw

A color can also be a simple string. You can use any of the following color formats:

- HEX, e.g `#FF0000`
- Short HEX, e.g. `#F00`
- RGBA, e.g. `rgb(255, 0, 0)`
- RGBA Percentage, e.g. `rgb(255, 0, 0, 1.0)`
- HSL, e.g. `hsla(200, 20%, 33%, 0.2)`
- Keywords, e.g. `red`
