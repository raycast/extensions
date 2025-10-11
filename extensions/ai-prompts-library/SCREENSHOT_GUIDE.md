# Screenshot Guide for Raycast Store

You need **2-6 screenshots** at **2000x1250px** (landscape format) for the Raycast Store listing.

---

## 📸 Recommended Screenshots

### Screenshot 1: Main Interface with Search Results
**What to show:**
- The main list view with multiple prompts visible
- Search bar at the top
- Category dropdown filter visible
- Different categories displayed (Development, Marketing, etc.)
- Color-coded category badges on prompts

**How to capture:**
1. Open Raycast (⌘Space)
2. Type "Search AI Prompts" and open the extension
3. Let it load all prompts
4. Position the window nicely on your screen
5. Take screenshot (⌘⇧4, then spacebar, click window)

---

### Screenshot 2: Search in Action
**What to show:**
- Search bar with a search term entered (e.g., "email", "code", "marketing")
- Filtered results showing matching prompts
- Demonstrates the search functionality

**How to capture:**
1. With extension open, type a search term
2. Show relevant results
3. Take screenshot

---

### Screenshot 3: Category Filter Dropdown
**What to show:**
- The dropdown menu open showing all categories
- Demonstrates filtering capability

**How to capture:**
1. Click on the category dropdown in the search bar
2. Show all category options with icons
3. Take screenshot while dropdown is open

---

### Screenshot 4: Actions Panel
**What to show:**
- A prompt selected
- Actions panel visible showing:
  - "Paste to Active App"
  - "Copy to Clipboard"
  - "View Full Prompt"

**How to capture:**
1. Select a prompt (arrow down to highlight one)
2. Press ⌘K to show actions panel (or it may show automatically)
3. Take screenshot showing the actions

---

### Screenshot 5: Different Category View (Optional)
**What to show:**
- Select a specific category from dropdown (e.g., "Development")
- Show filtered results for that category only
- Demonstrates category organization

---

### Screenshot 6: Prompt with Long Preview (Optional)
**What to show:**
- A prompt with detailed subtitle showing preview text
- Shows how users can preview prompt content before copying

---

## 🎨 Screenshot Best Practices

### Background
- Use a clean, uncluttered desktop background
- Neutral colors work best (light gray, blue, or use Raycast's blur effect)
- Avoid desktop icons or sensitive information

### Window Position
- Center the Raycast window in the screenshot
- Leave some padding around the edges
- Consistent positioning across all screenshots

### Content
- Use real prompts from your library
- Show variety of categories
- No sensitive personal information
- No placeholder or test data

### Quality
- High resolution (2000x1250px)
- Sharp, clear text
- Good contrast
- Consistent theme (all light mode OR all dark mode)

---

## 🛠️ How to Create Screenshots

### Method 1: macOS Screenshot Tool (Recommended)

1. **Open Screenshot tool**: Press ⌘⇧5
2. **Select "Capture Selected Window"**
3. **Click Options > Show Mouse Pointer** (optional)
4. **Click the Raycast window** to capture
5. Screenshot saved to Desktop

### Method 2: Quick Capture

1. **Press ⌘⇧4**
2. **Press Spacebar** (cursor becomes a camera icon)
3. **Click the Raycast window**
4. Screenshot saved to Desktop

---

## 📐 Resize Screenshots to 2000x1250px

### Using Preview (Built-in macOS app):

1. Open screenshot in Preview
2. Tools > Adjust Size...
3. Set width to 2000 pixels
4. Uncheck "Scale proportionally" if needed
5. Set height to 1250 pixels
6. Click OK
7. Save (⌘S)

### Using ImageMagick (Command Line):

```bash
# Install ImageMagick (if not installed)
brew install imagemagick

# Resize single screenshot
magick convert screenshot.png -resize 2000x1250! screenshot-resized.png

# Resize all screenshots in a folder
for file in *.png; do
  magick convert "$file" -resize 2000x1250! "resized-$file"
done
```

### Using Online Tools:

- Photopea (https://www.photopea.com/) - Free online Photoshop alternative
- Canva (https://www.canva.com/) - Create custom canvas at 2000x1250px
- ResizeImage.net - Simple online resizer

---

## 📁 Organizing Your Screenshots

Create a folder structure:
```
screenshots/
├── 01-main-interface.png
├── 02-search-results.png
├── 03-category-filter.png
├── 04-actions-panel.png
├── 05-category-view.png
└── 06-prompt-preview.png
```

**Naming tips:**
- Use numbers for ordering (01, 02, 03...)
- Descriptive names
- Consistent format

---

## ✅ Screenshot Checklist

Before uploading, verify each screenshot:
- [ ] Correct dimensions: 2000x1250px
- [ ] PNG format
- [ ] Clear, sharp, readable text
- [ ] No sensitive information visible
- [ ] Consistent background/theme
- [ ] Shows key features of the extension
- [ ] Good variety (search, filter, actions)
- [ ] Professional appearance

---

## 🚀 Ready to Upload

When you run `npm run publish`, you'll be prompted to upload these screenshots as part of the submission process. Have them ready in a folder!

**Note:** You can also add screenshots later by updating your extension's PR on GitHub.
