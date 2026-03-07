# Extension Icon Guide

Your extension needs a 512x512px icon in PNG format. Here's how to create one.

## Quick Method: Use Raycast Icon Generator

The easiest way is to use Raycast's official icon generator:

1. Go to [icon.ray.so](https://icon.ray.so/)
2. Choose a style:
   - **Gradient** - Modern gradient backgrounds
   - **Solid** - Single color backgrounds
   - **Transparent** - No background
3. Add your icon/emoji:
   - Use an emoji: 🪣 (bucket emoji)
   - Upload an SVG icon
   - Use a letter: "B"
4. Customize colors to match your brand
5. Download as PNG (512x512px)
6. Save as `icon.png` in the extension root

## Design Tips

### For Bucket Extension

**Recommended Approach:**

- Use the bucket emoji 🪣 with a gradient background
- Colors: Blue/Purple gradient (matches productivity theme)
- Or use a bookmark icon 🔖 with similar colors

**Alternative:**

- Letter "B" with a clean, modern font
- Solid color background (blue or purple)
- Keep it simple and recognizable

### General Guidelines

✅ **Do:**

- Keep it simple and recognizable
- Use high contrast for visibility
- Test in both light and dark themes
- Make it unique (not default Raycast icon)
- Use colors that represent your brand

❌ **Don't:**

- Use complex designs with small details
- Use low contrast colors
- Use the default Raycast icon
- Use copyrighted images without permission
- Make it too similar to existing extensions

## Testing Your Icon

1. Save your icon as `icon.png` in the extension root
2. Run `npm run dev`
3. Open Raycast and search for your extension
4. Check how it looks in:
   - Search results
   - Extension preferences
   - Light theme
   - Dark theme

## Alternative: Figma Template

If you prefer more control:

1. Download the [Icon Template](https://www.figma.com/community/file/1030764827259035122/Extensions-Icon-Template)
2. Open in Figma (free account works)
3. Customize the template
4. Export as PNG (512x512px)
5. Save as `icon.png`

## Need Help?

If design isn't your strength:

1. Ask in [#extensions channel](https://raycast.com/community) on Slack
2. Many community members are happy to help
3. Share your extension idea and someone might create an icon for you

## Icon Specifications

| Property | Value                       |
| -------- | --------------------------- |
| Size     | 512x512px                   |
| Format   | PNG                         |
| Filename | `icon.png`                  |
| Location | Extension root              |
| Themes   | Must work in light and dark |

## Separate Light/Dark Icons (Optional)

If you want different icons for light and dark themes:

1. Create two icons:
   - `icon.png` - Light theme
   - `icon@dark.png` - Dark theme

2. Update `package.json`:
   ```json
   {
     "icon": {
       "light": "icon.png",
       "dark": "icon@dark.png"
     }
   }
   ```

## Example Icons from Popular Extensions

Look at these for inspiration:

- [Todoist](https://www.raycast.com/thomaslombart/todoist) - Simple, recognizable
- [Notion](https://www.raycast.com/notion/notion) - Brand colors
- [GitHub](https://www.raycast.com/raycast/github) - Clean, minimal
- [Spotify](https://www.raycast.com/mattisssa/spotify-player) - Iconic brand

## Quick Checklist

- [ ] Icon is 512x512px
- [ ] Icon is in PNG format
- [ ] Icon is named `icon.png`
- [ ] Icon is in extension root directory
- [ ] Icon looks good in light theme
- [ ] Icon looks good in dark theme
- [ ] Icon is unique (not default Raycast icon)
- [ ] Icon is simple and recognizable
- [ ] Unused icon files removed

---

**Once your icon is ready, update the STORE_SUBMISSION_CHECKLIST.md!**
