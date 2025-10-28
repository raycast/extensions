# Color Contrast Checker

A Raycast extension to check WCAG color contrast ratios between two colors.

## Features

- 🎨 Enter hex colors manually or paste from Raycast's Color Picker
- 📊 Calculate WCAG contrast ratios with precise formulas
- ✅ Check AA and AAA compliance levels
- 📋 Easy copy of colors and contrast ratios
- 📱 Beautiful visual display with color swatches

## Usage

1. Launch the command "Check Color Contrast" in Raycast
2. Enter the first color as a hex code (e.g., `#FF5733` or `FF5733`)
3. Enter the second color as a hex code
4. Press Enter or click "Check Contrast"
5. View the detailed results including:
   - Visual color swatches
   - Contrast ratio (e.g., 4.5:1)
   - WCAG AA and AAA compliance status
   - Pass/fail for normal and large text

### Pro Tip: Using with Color Picker

For the best experience picking colors from your screen:

1. Install Raycast's built-in Color Picker extension (if not already installed)
2. Use the Color Picker to select a color from anywhere on screen
3. The hex code will be copied to your clipboard
4. Paste it into the Color Contrast Checker
5. Repeat for the second color

## WCAG Standards

### Level AA (Minimum)

- Normal text: 4.5:1
- Large text: 3:1

### Level AAA (Enhanced)

- Normal text: 7:1
- Large text: 4.5:1

**Text sizes:**

- Normal text: Under 18pt (or 14pt bold)
- Large text: 18pt and larger (or 14pt bold and larger)

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Lint the code
npm run lint

# Fix lint issues
npm run fix-lint
```

## Icon Setup

To add a custom icon:

1. Create a 512×512px PNG icon
2. Save it as `assets/command-icon.png`
3. The icon should represent color contrast checking (e.g., two contrasting colors)

## Technical Details

The extension implements the WCAG 2.1 color contrast calculation formula:

1. Converts hex colors to RGB
2. Calculates relative luminance for each color using gamma correction
3. Computes contrast ratio: `(L1 + 0.05) / (L2 + 0.05)` where L1 is lighter
4. Compares against WCAG thresholds for compliance

## License

MIT
