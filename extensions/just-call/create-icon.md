# Creating the Icon

To create a 512x512 PNG icon from the SVG:

## Option 1: Using macOS Preview
1. Open `assets/phone.svg` in Preview
2. File → Export
3. Format: PNG
4. Save as `phone.png` in the root directory

## Option 2: Using an online converter
1. Go to https://cloudconvert.com/svg-to-png
2. Upload `assets/phone.svg`
3. Set dimensions to 512x512
4. Download and save as `phone.png` in the root directory

## Option 3: Using command line (if you have ImageMagick)
```bash
convert -background none -density 512 assets/phone.svg -resize 512x512 phone.png
```

## Option 4: Use Raycast's Icon Template
Download from: https://www.figma.com/community/file/1030764827259035122

The icon should be:
- 512x512 pixels
- PNG format
- Work well in both light and dark themes
- Have a distinctive design that represents calling/phone functionality