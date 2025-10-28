# Getting Started with Color Contrast Checker

## 🎉 Your Extension is Ready!

The Raycast Color Contrast Checker extension has been successfully set up with all the required files and functionality.

## 📁 Project Structure

```
raycast-color-contrast-checker/
├── src/
│   ├── index.tsx                 # Main extension component
│   └── utils/
│       ├── contrast.ts           # WCAG calculation utilities
│       └── contrast.test.ts      # Test file (optional)
├── assets/
│   └── command-icon.png          # Extension icon (placeholder)
├── package.json                  # Extension manifest
├── tsconfig.json                 # TypeScript config
├── .eslintrc.js                  # ESLint config
├── .prettierrc                   # Prettier config
└── README.md                     # Documentation

```

## 🚀 How to Use

### Option 1: Development Mode (Recommended for Testing)

```bash
npm run dev
```

This will:

- Start the extension in development mode
- Automatically reload on file changes
- Allow you to test in Raycast immediately

### Option 2: Build and Install

```bash
npm run build
```

Then import the extension in Raycast:

1. Open Raycast
2. Go to Extensions
3. Click "+" and select "Import Extension"
4. Navigate to the `dist` folder

## 🎨 Using the Extension

1. Open Raycast (⌘ + Space)
2. Type "Check Color Contrast"
3. Enter your first color (e.g., `#000000` or `000000`)
4. Enter your second color (e.g., `#FFFFFF` or `FFFFFF`)
5. Press Enter to see the results!

### Pro Workflow with Color Picker:

1. In Raycast, run "Pick Color" (from the built-in Color Picker extension)
2. Click anywhere on your screen to pick a color
3. The hex code is copied to your clipboard
4. Open "Check Color Contrast"
5. Paste the color (⌘ + V)
6. Repeat for the second color
7. View the WCAG compliance results!

## ✅ Features Implemented

- ✅ Hex color input (with or without #)
- ✅ WCAG 2.1 contrast ratio calculation
- ✅ Relative luminance formula with gamma correction
- ✅ AA compliance checking (4.5:1 normal, 3:1 large)
- ✅ AAA compliance checking (7:1 normal, 4.5:1 large)
- ✅ Visual color swatches in results
- ✅ Copy colors and ratios to clipboard
- ✅ Keyboard shortcuts for quick actions
- ✅ Input validation for hex colors
- ✅ Beautiful metadata sidebar with all compliance info

## 🎯 Keyboard Shortcuts

When viewing results:

- `⌘ + C` - Copy contrast ratio
- `⌘ + Shift + 1` - Copy first color
- `⌘ + Shift + 2` - Copy second color
- `⌘ + R` - Check new colors (reset)

## 🔧 Customization Ideas

Want to enhance the extension? Here are some ideas:

1. **Add more color formats**: Support RGB, HSL, etc.
2. **Color palette testing**: Test multiple colors at once
3. **Suggestions**: Automatically suggest passing colors
4. **History**: Save recently tested color pairs
5. **Export**: Generate reports of color combinations

## 🐛 Troubleshooting

### Extension doesn't appear in Raycast

- Make sure you ran `npm run dev`
- Check that Raycast is running
- Try restarting Raycast

### Build errors

- Run `npm install` to ensure all dependencies are installed
- Check that you're using a recent version of Node.js (v16+)

### Colors not validating

- Ensure hex codes are 3 or 6 characters (with or without #)
- Valid examples: `#FF5733`, `FF5733`, `#FFF`, `FFF`

## 📚 Resources

- [Raycast API Documentation](https://developers.raycast.com/)
- [WCAG Contrast Guidelines](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/) (for validation)

## 🎨 Icon Setup

The extension currently uses a placeholder icon. To add a custom icon:

1. Create a 512×512px PNG image
2. Save it as `assets/command-icon.png`
3. Rebuild the extension with `npm run build`

Icon design tips:

- Use contrasting colors to represent the extension's purpose
- Keep it simple and recognizable at small sizes
- Consider using two colored circles or squares

## 🤝 Contributing

Feel free to enhance this extension! Some areas for improvement:

- Add more color input formats
- Implement color history
- Add color palette testing
- Create color suggestions for better contrast

---

**Enjoy building accessible designs with perfect color contrast! 🎨✨**
