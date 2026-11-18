# Store Screenshots

Raycast Store listings require screenshots in this folder.

## Specifications

- **Size**: 2000 × 1250 pixels (landscape)
- **Aspect ratio**: 16:10
- **Format**: PNG
- **Maximum**: 6 screenshots
- **Minimum recommended**: 3

## Required Screenshots

1. **Search Effect Docs — Main Results**
    - Show the search command with both Guide and API Reference sections visible
    - Include the dropdown filter and search bar

2. **Search Effect Docs — API Reference Filtered**
    - Show API results with module subtitles (e.g., `Effect.flatMap`)

3. **Ask Effect AI — Question Form**
    - Show the Form view with the question input

4. **Ask Effect AI — AI Response**
    - Show the Detail view with a generated AI response

5. **Raycast AI Chat — @effect-docs Mention**
    - Show the AI Chat with `@effect-docs` and a response (optional but great)

## How to Take Screenshots

Raycast has a built-in screenshot tool for extensions:

1. **Set up Window Capture**
    - Open Raycast Preferences → Advanced
    - Set a hotkey for Window Capture (e.g., `⌘⇧⌥M`)
    - Enable Save to Metadata

2. **Start Development Mode**

    ```bash
    npm run dev
    ```

3. **Open Each Command**
    - Launch `Search Effect Docs`
    - Launch `Ask Effect AI`
    - Open Raycast AI Chat and type `@effect-docs`

4. **Capture Screenshots**
    - Open the command you want to screenshot
    - Press your Window Capture hotkey
    - Make sure Save to Metadata is checked
    - Screenshots will be saved to this folder automatically

5. **Clean Up**
    - Remove any blurry or redundant screenshots
    - Keep only the best 3–6 shots
    - Ensure no sensitive data is visible

## Tips

- Use a clean desktop background (good contrast)
- Use the same background across all screenshots
- Don't include other applications — focus entirely on Raycast
- Make sure text is readable at full size

## After Capturing

Run the build and lint commands to ensure everything is ready:

```bash
npm run build && npm run lint
```

Then submit to the Raycast Store with `npm run publish`.
