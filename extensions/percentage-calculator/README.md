# Percentage Calculator - Raycast Extension

A comprehensive percentage calculator for Raycast that provides a **Full Statistics** view with colorful card-based results. Enter any two values and get a complete breakdown of all possible percentage calculations in one go!

## What You Get

When you enter two values (e.g., 100 and 150), the extension instantly calculates:

- **Basic Percentages**: 100% of 150 = 150, and 150% of 100 = 150
- **Percentage Ratios**: 100 is 66.67% of 150, and 150 is 150% of 100  
- **Percentage Difference**: 40% difference between the two values
- **Percentage Changes**: 50% increase from 100→150, and 33.33% decrease from 150→100

## Features

- 🎨 **Beautiful Card Design**: Results displayed as colorful, easy-to-read cards
- 📊 **Complete Analysis**: Get 7 different calculations from just 2 input values
- 📋 **Smart Copy Options**: Copy individual results or all calculations at once
- 🎯 **Intelligent Icons**: Each calculation type has its own color and icon
- ⚡ **Instant Results**: No need to select calculation types - get everything automatically
- 🔄 **Interactive Interface**: Easy navigation between input and results

## Installation

### From Raycast Store (Recommended)

1. **Install Raycast**: Download from [raycast.com](https://raycast.com)
2. **Open Raycast Store**: 
   - Launch Raycast (⌘ + Space)
   - Type "Store" or click the Store tab
3. **Search for Extension**:
   - Search for "Percentage Calculator"
   - Click "Install" on the extension
4. **Start Using**: 
   - Type "Percentage Calculator" or "perc" in Raycast
   - Enter your two values and get instant results!

### Manual Development Setup

If you want to modify or contribute to the extension:

### Prerequisites

1. **Install Raycast**: Download from [raycast.com](https://raycast.com)
2. **Install Node.js**: Download from [nodejs.org](https://nodejs.org) (version 16 or higher)
3. **Install Raycast CLI**: Run in terminal:
   ```bash
   npm install -g @raycast/api
   ```

### Setup Instructions

1. **Create Project Directory**:
   ```bash
   mkdir percentage-calculator-raycast
   cd percentage-calculator-raycast
   ```

2. **Copy Files**: Create the following files in your project directory:
   - `package.json`
   - `tsconfig.json` 
   - `src/percentage-calculator.tsx`

3. **Install Dependencies**:
   ```bash
   npm install
   ```

### Testing the Extension

1. **Development Mode**:
   ```bash
   npm run dev
   ```
   This starts the development server and automatically imports the extension into Raycast.

2. **Test in Raycast**:
   - Open Raycast (⌘ + Space)
   - Type "Percentage Calculator" or "perc"
   - Select the extension from the results
   - The calculator interface will open

3. **Build for Production**:
   ```bash
   npm run build
   ```

4. **Import Built Extension**:
   - In Raycast, go to Extensions tab
   - Click "Import Extension"
   - Select the built extension file

### Usage Examples

1. **Quick Full Statistics**:
   - Launch the extension
   - Enter 100 in "Value 1"
   - Enter 150 in "Value 2"
   - Press ⌘ + Enter
   - Get 7 different calculations instantly displayed as colorful cards

2. **Card Results Include**:
   - Basic percentages (100% of 150, 150% of 100)
   - Percentage ratios (100 is 66.67% of 150, 150 is 150% of 100)
   - Percentage difference (40% difference)
   - Percentage changes (50% increase from 100→150, 33.33% decrease from 150→100)

3. **Copy Options**:
   - Copy individual calculation results
   - Copy full calculation text
   - Copy all results at once
   - Quick clipboard access for all values

### Troubleshooting

**Extension not appearing in Raycast:**
- Make sure you're in development mode: `npm run dev`
- Check terminal for any error messages
- Verify all dependencies are installed

**Calculation errors:**
- Ensure you're entering valid numbers
- Check that you're using the correct fields for your calculation type
- Some calculations require specific combinations of fields

**Build errors:**
- Run `npm run lint` to check for code issues
- Ensure TypeScript is properly configured
- Check that all imports are correct

### Keyboard Shortcuts

- **⌘ + Enter**: Calculate
- **⌘ + C**: Copy result (when available)
- **⌘ + Shift + C**: Copy full calculation (when available)

### Customization

You can modify the extension by:
- Adding new calculation types in the dropdown
- Changing the styling and layout
- Adding more precision to decimal places
- Including additional mathematical operations

## Development Notes

- The extension uses React with TypeScript
- Built with Raycast API v1.48.9
- Follows Raycast's design guidelines
- Includes proper error handling and user feedback