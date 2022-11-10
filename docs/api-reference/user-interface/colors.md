# Colors

Anywhere you can pass a color in a component prop, you can pass either:

- A standard [Color](#color)
- A [Dynamic](#color.dynamic) Color
- A [Raw](#color.raw) Color

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

| Name          | Dark Theme                                               | Light Theme                                         |
| :------------ | :------------------------------------------------------- | :-------------------------------------------------- |
| Blue          | ![](../../.gitbook/assets/color-dark-blue.png)           | ![](../../.gitbook/assets/color-blue.png)           |
| Brown         | ![](../../.gitbook/assets/color-dark-brown.png)          | ![](../../.gitbook/assets/color-brown.png)          |
| Green         | ![](../../.gitbook/assets/color-dark-green.png)          | ![](../../.gitbook/assets/color-green.png)          |
| Magenta       | ![](../../.gitbook/assets/color-dark-magenta.png)        | ![](../../.gitbook/assets/color-magenta.png)        |
| Orange        | ![](../../.gitbook/assets/color-dark-orange.png)         | ![](../../.gitbook/assets/color-orange.png)         |
| Purple        | ![](../../.gitbook/assets/color-dark-purple.png)         | ![](../../.gitbook/assets/color-purple.png)         |
| Red           | ![](../../.gitbook/assets/color-dark-red.png)            | ![](../../.gitbook/assets/color-red.png)            |
| Yellow        | ![](../../.gitbook/assets/color-dark-yellow.png)         | ![](../../.gitbook/assets/color-yellow.png)         |
| PrimaryText   | ![](../../.gitbook/assets/color-dark-primary-text.png)   | ![](../../.gitbook/assets/color-primary-text.png)   |
| SecondaryText | ![](../../.gitbook/assets/color-dark-secondary-text.png) | ![](../../.gitbook/assets/color-secondary-text.png) |

## Types

### Color.ColorLike

```typescript
ColorLike: Color | Color.Dynamic | Color.Raw;
```

Union type for the supported color types.

When using a [Raw Color](#color.raw), it will be dynamically adjusted to achieve high contrast with the Raycast user interface.

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

### Color.Dynamic

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

<InterfaceTableFromJSDoc name="Color.Dynamic" />

### Color.Raw

A color can also be a simple string. You can use any of the following color formats:

- HEX, e.g `#FF0000`
- Short HEX, e.g. `#F00`
- RGBA, e.g. `rgb(255, 0, 0)`
- RGBA Percentage, e.g. `rgb(255, 0, 0, 1.0)`
- HSL, e.g. `hsla(200, 20%, 33%, 0.2)`
- Keywords, e.g. `red`
