import { Detail } from "@raycast/api";

export default function SpaceIdTutorial() {
  const markdown = `
# How to Find Your Space IDs

*This tutorial can be accessed anytime through the command's action menu (⌘+K) or directly (⌘+T)*

---

Space IDs are unique identifiers that Craft uses internally to distinguish between different spaces in your account.

## Why Do You Need This?

- **Better Organization**: Instead of seeing cryptic IDs like "1ab23c45-67de-89f0-1g23-hijk456789l0", you can rename them to names like "Personal Space" or "Team Space"
- **Space Management**: Enable or disable specific spaces across all extension commands
- **Consistent Naming**: Use the same space names throughout all Craft extension commands

## Step-by-Step Guide

### 1. Open Craft App
Navigate to any Space you want to identify.

### 2. Open Any Document
Navigate to any document within that space.

### 3. Right-Click (Secondary Click)
Right-click on any block within the document.

### 4. Copy the Deeplink
From the context menu that appears:
1. Select **"Copy As"**
2. Then select **"Deeplink"**

### 5. Extract the Space ID
The deeplink will be copied to your clipboard and looks something like this:

\`\`\`
craftdocs://open?blockId=ABC123&spaceId=1ab23c45-67de-89f0-1g23-hijk456789l0
\`\`\`

The **Space ID** is the long string after \`spaceId=\` in the URL.

In this example: \`1ab23c45-67de-89f0-1g23-hijk456789l0\`

### 6. Use in Manage Spaces
Now you can use the Manage Spaces command to:
- Rename this cryptic ID as you wish
- Enable or disable this space across all extension commands

## Tips

- **Multiple Spaces**: Repeat this process for each space you want to manage
- **Any Block Works**: You can right-click on any block in a space to get its Space ID
- **Consistent IDs**: The Space ID remains the same for all blocks within the same space
- **One-Time Setup**: Once you've renamed your spaces, you won't need to do this again

## Troubleshooting

**Can't find "Copy As" option?**
- Make sure you're right-clicking directly on text or a block, not empty space
- Try right-clicking on a document title in the sidebar

**Space ID looks different?**
- Space IDs are always long strings of letters, numbers, and dashes
- Each space has a unique ID - they should all look different

`;

  return <Detail markdown={markdown} />;
}
