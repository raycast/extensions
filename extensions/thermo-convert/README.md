# ThermoConvert

Instantly convert between all major temperature scales directly from Raycast.

## Features

### Core Functionality
- **Bidirectional conversion** - convert from any unit to all others
- **Real-time conversion** as you type
- **Zero network dependency** - fully offline
- **Deterministic and accurate** calculations
- **Configurable default unit** - set your preferred starting unit in settings

### Supported Temperature Scales
- 🌡️ Celsius (°C) - Metric standard
- 🇺🇸 Fahrenheit (°F) - US standard
- 🔬 Kelvin (K) - Scientific absolute scale
- ⚗️ Rankine (°R) - Absolute Fahrenheit
- 📜 Réaumur (°Ré) - Historical scale

### Visual Enhancements
- **Color-coded indicators** - Blue for cold, orange for hot
- **Contextual descriptions** - "Room temperature", "Freezing point", etc.
- **Precise values** - See up to 6 decimal places
- **Unit icons** - Visual identification for each scale
- **Smart tooltips** - Hover for additional information

## Usage

1. Launch the extension with `Convert Temperature`
2. Select the source unit from the dropdown (or use your default from settings)
3. Type a temperature value
4. See instant conversions to all other scales with visual context
5. Use keyboard shortcuts to copy results

### Input Formats

The extension accepts various numeric formats:

- `25` - Simple number (room temperature)
- `36.6` - Decimals (body temperature)
- `-10` - Negative values (cold weather)
- `273.15` - Large values (absolute zero)
- `0` - Freezing point
- `100` - Boiling point

## Why ThermoConvert?

Temperature conversion is a common need for developers, engineers, scientists, and globally-distributed teams. Existing solutions require mental arithmetic, web searches, or opening a calculator — all of which break your flow.

ThermoConvert is designed to be:
- **Fast** - Response time under 10ms
- **Simple** - No configuration needed
- **Predictable** - Just accuracy, speed, and calm

## Keyboard Shortcuts

### Copy Actions
- `⌘↵` - Copy formatted value (e.g., "77.00 °F")
- `⌘⇧C` - Copy number only (e.g., "77.00")
- `⌘⇧P` - Copy precise value with 6 decimals (e.g., "77.000000")

### Quick Actions
- `⌘S` - Switch source unit to the selected result's unit

## Settings

You can configure your preferred default temperature unit in the extension settings:

1. Open Raycast preferences
2. Navigate to ThermoConvert
3. Select your default unit (Celsius, Fahrenheit, Kelvin, Rankine, or Réaumur)
4. The dropdown will remember your choice across sessions