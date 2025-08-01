# Color Picker Extension

A simple system-wide color picker. The color picker can be triggered with a standalone command or as part of the menu bar command. The menu bar shows the last nine picked colors. The Organize Colors command can be used to see all colors. From the Organize Colors command and the Generate Colors command you can select multiple colors and create color palettes that will be saved on the Local Storage.

[![raycast-cross-extension-badge]][raycast-cross-extension-link]

## Key Features

- Pick a color on your desktop
- Access your colors from the menu bar
- Organize your colors
- Generate colors using UI
- Pick a color using AI
- Pick a color with color wheel
- Convert any color to a different format
- Get the color name for a hex code
- Create and manage color palettes
- Edit existing color palettes
- Duplicate palettes to create instant copies
- Copy color palettes in multiple formats

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

#### Receive Callback Result

```typescript
import { LaunchProps } from "@raycast/api";
import { useEffect } from "react";

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

## Color Palette Management

The Color Picker extension includes comprehensive palette management features:

### **Creating Palettes**

- Save selected colors from `organize-colors` or `generate-colors` directly to a new palette
- Use the `save-color-palette` command to save new palettes
- Add names, descriptions, and keywords for easy organization
- Support for both light and dark palette modes

### **Managing Palettes**

- Browse all palettes with the `view-color-palettes` command
- Edit existing palettes while preserving their original creation date
- Duplicate palettes to create instant copies
- Delete palettes you no longer need
- Search through palettes by name, description, or keywords

### Professional Copy System

Copy your color palettes to clipboard in multiple formats with native Raycast behavior - the extension automatically closes and shows a brief system notification upon successful copy.

#### Copy Formats Available:

- **JSON**: Complete metadata for data interchange
- **CSS Classes**: Ready-to-use CSS with color and background variants
- **CSS Variables**: Modern CSS custom properties for design systems
- **Plain Text**: Human-readable format for documentation

#### Copy Examples:

**CSS Variables:**

```css
:root {
  --ocean-vibes-1: #2e86ab;
  --ocean-vibes-2: #a23b72;
  --ocean-vibes-3: #f18f01;
}
```

**CSS Classes:**

```css
.ocean-vibes-color-1 {
  color: #2e86ab;
}
.ocean-vibes-bg-1 {
  background-color: #2e86ab;
}
```

**JSON:**

```json
{
  "name": "Ocean Vibes",
  "description": "Calm blues and greens inspired by the ocean",
  "colors": ["#2e86ab", "#a23b72", "#f18f01"],
  "keywords": ["ocean", "nature", "calm"],
  "mode": "light"
}
```

### Palette Workflow

1. Use the existing **Pick Colors** and **Organize Colors** or **Generate Colors** commands to gather colors
2. Select multiple colors via the Actions menu, and **Save the Palette**: edit the form by including name, description, keywords, and theme mode, optionally adding/removing colors
3. **View Palette**: View the existing palettes, edit or duplicate them
4. **Copy Palette Colors**: Choose your preferred format and copy to clipboard, or copy individual colors

### Integration with Existing Features

- **Color History**: All picked colors are available for palette creation
- **Menu Bar**: Quick access to recent palettes alongside colors
- **Cross-Extension API**: Palette operations work with the existing API structure

## **Perfect for Web Development and Beyond**

Whether you're tweaking CSS, fine-tuning gradients, or selecting the perfect hue for your next design project, Color Picker is your go-to tool. From HEX to RGB, HSL to CMYK, we've got all your color values covered.

## **Development**

### **Running Tests**

The extension includes utility function tests:

```bash
# Test palette copy functionality
npx ts-node src/__tests__/simple-copy-tests.ts

# Test validation utilities
npx ts-node src/__tests__/simple-validation-tests.ts
```

These tests cover palette export formats (JSON, CSS, CSS Variables, Plain Text), color validation, and keyword validation.

## **Frequently Asked Questions**

### **How do I activate Color Picker?**

Launching the Color Picker is easy. Simply hit your Raycast hotkey (default is ⌘+Space) and type "color picker" or "pick color". The extension will spring to life, ready to capture any hue on your screen. If you're looking to integrate it with your extension you can trigger the color picker programmatically using the `crossLaunchCommand` function.

### **What is the command for Color Picker?**

Raycast's Color Picker doesn't rely on complex commands \- it's all about simplicity and speed. The primary commands are:

1. `pick-color`: This launches the main color picker interface.
2. `color-wheel`: Opens the interactive color wheel for precise hue selection.
3. `organize-colors`: Allows you to view your colors.
4. `save-color-palette`: Opens an interactive form for saving your color palettes.
5. `view-color-palettes`: Allows you to view and manage your color palettes.

Pro tip: These commands can be customized or aliased in your Raycast preferences for even quicker access.

### **How does the Color Picker tool work?**

Raycast's Color Picker tool is a powerhouse of functionality. Here's a breakdown of its core operations:

1. **Screen Sampling**: Click anywhere on your screen to instantly capture the color of any pixel.
2. **Format Flexibility**: The picked color is immediately available in multiple formats \- HEX, RGB, HSL, and CMYK. Convert between these with a single click.
3. **Color Wheel**: Fine-tune your selection using the interactive color wheel, adjusting hue, saturation, and brightness.
4. **AI Integration**: Leverage machine learning to generate complementary colors or entire palettes based on your picked color.
5. **Cross-App Compatibility**: Thanks to our API, the Color Picker can seamlessly interact with other Raycast extensions.
6. **Clipboard Integration**: Copy picked colors directly to your clipboard for instant use in design apps or code editors.
7. **Save, view and manage color palettes**: Save your picked & organized color, or your AI-generated colors, to color palettes and manage them.
