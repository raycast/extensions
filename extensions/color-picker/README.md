A simple system-wide color picker. The color picker can be triggered with a standalone command or as part of the menu bar command. The menu bar shows the last nine picked colors. The Organize Colors command can be used to see all colors.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Key Features

- Pick a color on your desktop
- Access your colors from the menu bar
- Organize your colors with multi-selection support
- Select and copy multiple colors in various formats (JSON, CSS Classes, CSS Variables)
- Generate colors using UI
- Pick a color using AI
- Pick a color with color wheel
- Convert any color to a different format
- Get the color name for a hex code

## API

This extensions follows [Raycast Cross-Extension Conventions][raycast-cross-extension-link].

You can use `crossLaunchCommand` to use the picker color result.

### Launch Context Options

#### `copyToClipboard`

Type: `boolean`\
Default: `false`

Copy to clipboard is disabled by default. Set it to `true` to enable copy action.

#### `callbackLaunchOptions`

Type: `LaunchOptions`\
Default: `undefined`

Use this option to let this extension know what kind of callback needs to be performed when `crossLaunchCommand`.

### Callback Context Options

#### `hex`

Type: `string`

It returns the color picker hex result.

#### `formattedColor`

Type: `string`

It returns the formatted color result. The format can be changed in the preferences of the extension.

### Examples

#### Launch Color Picker

```typescript
import { LaunchType } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

await crossLaunchCommand({
  name: "pick-color",
  type: LaunchType.UserInitiated,
  extensionName: "color-picker",
  ownerOrAuthorName: "thomas",
});
```

#### Launch Color Wheel

```typescript
import { LaunchType } from "@raycast/api";
import { crossLaunchCommand } from "raycast-cross-extension";

await crossLaunchCommand({
  name: "color-wheel",
  type: LaunchType.UserInitiated,
  extensionName: "color-picker",
  ownerOrAuthorName: "thomas",
});
```

#### Rececive Callback Result

```typescript
import { LaunchProps } from "@raycast/api";

type LaunchContext = {
  hex?: string;
};

export default function Command({ launchContext = {} }: LaunchProps<{ launchContext?: LaunchContext }>) {
  useEffect(() => {
    if (launchContext.hex) {
      console.log(launchContext.hex);
    }
  }, []);
}
```

## Who's using Color Picker Cross-Extension API

- [Badges - shields.io](https://raycast.com/litomore/badges) - Concise, consistent, and legible badges

[raycast-cross-extension-link]: https://github.com/LitoMore/raycast-cross-extension-conventions
[raycast-cross-extension-badge]: https://shields.io/badge/Raycast-Cross--Extension-eee?labelColor=FF6363&logo=raycast&logoColor=fff&style=flat-square

## **Perfect for Web Development and Beyond**

Whether you're tweaking CSS, fine-tuning gradients, or selecting the perfect hue for your next design project, Color Picker is your go-to tool. From HEX to RGB, HSL to CMYK, we've got all your color values covered.

## **Frequently Asked Questions**

### **How do I activate Color Picker?**

Launching the Color Picker is easy. Simply hit your Raycast hotkey (default is ⌘+Space) and type "color picker" or "pick color". The extension will spring to life, ready to capture any hue on your screen. If you're looking to integrate it with your extension you can trigger the color picker programmatically using the `crossLaunchCommand` function.

### **What is the command for Color Picker?**

Raycast's Color Picker doesn't rely on complex commands \- it's all about simplicity and speed. The primary commands are:

1. `pick-color`: This launches the main color picker interface.
2. `color-wheel`: Opens the interactive color wheel for precise hue selection.
3. `organize-colors`: Allows you to manage and categorize your color palettes.

Pro tip: These commands can be customized or aliased in your Raycast preferences for even quicker access.

### **How does the Color Picker tool work?**

Raycast's Color Picker tool is a powerhouse of functionality. Here's a breakdown of its core operations:

1. **Screen Sampling**: Click anywhere on your screen to instantly capture the color of any pixel.
2. **Format Flexibility**: The picked color is immediately available in multiple formats \- HEX, RGB, HSL, and CMYK. Convert between these with a single click.
3. **Color Wheel**: Fine-tune your selection using the interactive color wheel, adjusting hue, saturation, and brightness.
4. **AI Integration**: Leverage machine learning to generate complementary colors or entire palettes based on your picked color.
5. **Cross-App Compatibility**: Thanks to our API, the Color Picker can seamlessly interact with other Raycast extensions.
6. **Clipboard Integration**: Copy picked colors directly to your clipboard for instant use in design apps or code editors.
