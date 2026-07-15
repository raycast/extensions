# PBR Assistant

A Raycast extension that helps 3D artists quickly find physically accurate PBR (Physically Based Rendering) diffuse colors and IOR (Index of Refraction) values for use in 3D rendering and material workflows.

## Features

### IOR Values
Search through a comprehensive database of Index of Refraction values for common materials including:
- **Liquids**: Water, ice, milk, alcohol, beer, cooking oil, honey, ketchup
- **Glass & Crystals**: Generic glass, flint glass, diamond, sapphire, ruby, emerald, quartz
- **Plastics**: Acrylic, polycarbonate, polystyrene, rubber
- **Metals**: Aluminum, copper, gold, iron, titanium (scalar values for artistic use)
- **Organic Materials**: Human skin, eye (cornea, lens, sclera), wood, paper, cotton/wool
- **Building Materials**: Concrete, brick, ceramic, marble, granite
- **Food & Beverages**: Milk, alcohol, beer, cooking oil, honey, ketchup
- **Other**: Air, salt, silicon, pearl, and more

### PBR Diffuse Colors
Browse and copy PBR diffuse color values for various materials. All values are **PBR Safe** (clamped between sRGB 30-240) to ensure physical validity in rendering engines.

**Features:**
- **PBR Safe Values**: All colors are clamped to the 30-240 sRGB range to avoid unrealistic albedo values.
- **Gray Tones**: Includes value-calibrated gray tones in 10% increments (mapped to the safe 30-240 range).
- **Accurate Data**: sourced from [physicallybased.info](https://physicallybased.info/).

**Categories:**
- **Metals**: Aluminum, brass, chromium, cobalt, copper, gold, silver, platinum, titanium, and more
- **Organic Materials**: Multiple skin tones (I-VI), bone, blood, eye components
- **Natural Materials**: Marble, sand, salt, snow, ice, water
- **Common Objects**: Coffee, chocolate, ketchup, banana, carrot, lemon
- **Special Materials**: MIT Black, Musou Black, gray card, whiteboard, blackboard

## Platform Support

✅ **macOS** - Fully supported  
✅ **Windows** - Fully supported

This extension uses only cross-platform Raycast APIs and has no platform-specific dependencies, making it compatible with both macOS and Windows.

## Usage

1. **Open Raycast** and search for "Find PBR/IOR Value" or "PBR Assistant"
2. **Switch between views** using the dropdown menu:
   - **PBR Diffuse Colors**: Visual grid view with color swatches
   - **IOR Values**: List view for easy searching and reading
3. **Search** for materials by typing in the search bar
4. **Select a material** and use the action panel:
   - Press `Enter` or click **Copy to Clipboard** to copy the Hex value
   - Press `Opt+C` to copy the **PBR Safe sRGB** value (e.g., "240, 240, 240")
   - Press `Cmd+V` (macOS) or `Ctrl+V` (Windows) to paste the value directly into your application

## Use Cases

- **3D Artists**: Quickly reference accurate IOR and PBR color values while working in Blender, Maya, 3ds Max, or other 3D software
- **Game Developers**: Get physically accurate material values for Unreal Engine, Unity, or other game engines
- **VFX Artists**: Reference correct material properties for realistic rendering
- **Material Designers**: Access a curated database of real-world material properties

## Technical Details

- **IOR Values**: Index of Refraction values are essential for realistic material rendering and light interaction
- **PBR Colors**: Physically Based Rendering diffuse colors represent the base color of materials, ready to use in popular 3D software
- All values are based on real-world material properties and industry-standard references

## Requirements

- Raycast application installed on macOS or Windows
- No additional setup or API keys required
