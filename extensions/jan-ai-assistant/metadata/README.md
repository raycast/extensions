# Metadata Screenshots Required

This extension has 5 view-type commands that require screenshots for Raycast Store submission:

## Required Screenshots

According to Raycast requirements, extensions with view-mode commands need screenshots showing the actual UI.

### Commands requiring screenshots:

1. **process-text** - Process with Jan.ai
   - Shows text processing interface with action selection menu

2. **quick-actions** - Jan.ai Quick Actions
   - Shows quick actions list (Summarize, Improve Writing, Fix Grammar, etc.)

3. **reminders-to-csv** - Convert Reminders to CSV
   - Shows the reminders text input form for CSV conversion

4. **create-reminder-from-pdf-direct** - Create Reminder from PDF
   - Shows PDF file picker with clipboard support indicator

5. **process-pdf-native** - Process PDF with Jan.ai
   - Shows PDF processing form with action dropdown (Extract Tasks, Summarize, Custom Prompt)

## Screenshot Specifications

- **Format**: PNG
- **Recommended size**: 1280x800px
- **Content**: Show actual UI of each command with representative data
- **Style**: Clean screenshots without borders (Raycast adds these automatically)

## How to Generate Screenshots

1. Run the extension in development mode:
   ```bash
   npm run dev
   ```

2. Open Raycast and trigger each command

3. Take screenshots at 1280x800px resolution

4. Save them in this `metadata` folder with descriptive names:
   - `jan-ai-assistant-1.png`
   - `jan-ai-assistant-2.png`
   - `jan-ai-assistant-3.png`
   - `jan-ai-assistant-4.png`
   - `jan-ai-assistant-5.png`

5. Copy the metadata folder to the PR repository at:
   `/Users/mike/.config/raycast/public-extensions-fork/extensions/jan-ai-assistant/metadata/`

## Note

The screenshots you provided show all 5 required commands. Save those PNG files in this folder, then copy the entire metadata folder to the PR repository location above.
