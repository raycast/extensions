# Metadata for Raycast Store Listing

This folder contains metadata files required for publishing the extension to the Raycast Store.

## Required Screenshots

According to the [Raycast documentation](https://developers.raycast.com/basics/prepare-an-extension-for-store#how-to-use-it), you need to include the following screenshots:

1. **Primary Screenshot (screenshot-1.png)**: 
   - Size: 2000 x 1250 pixels
   - Content: Main view showing OTP codes list

2. **Secondary Screenshot (screenshot-2.png)**:
   - Size: 2000 x 1250 pixels (current size is 1912 x 1324 pixels, needs to be updated)
   - Content: Add OTP form view

3. **Additional Screenshot (screenshot-3.png)**:
   - Size: 2000 x 1250 pixels
   - Content: Import OTP view

## How to Create Screenshots

1. Run the extension in development mode: `npm run dev`
2. Open Raycast and navigate to each view
3. Take screenshots using macOS screenshot tool (Shift+Command+4)
4. Resize the screenshots to exactly 2000 x 1250 pixels using an image editor
5. Save the screenshots in this folder with the correct naming convention

## Important Notes

- All screenshots must be exactly 2000 x 1250 pixels
- The current screenshot-2.png has incorrect dimensions (1912 x 1324 pixels) and needs to be updated
- Screenshots should clearly demonstrate the functionality of the extension
- Make sure the screenshots are high quality and visually appealing
