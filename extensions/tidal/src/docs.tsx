"use client";

import { List, Icon, Color } from "@raycast/api";
import { useState } from "react";

interface DocSection {
  id: string;
  title: string;
  icon: Icon;
  color: Color;
  content: string;
}

function generateRandomToken(length = 32): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()-_=+";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

const suggestedToken = generateRandomToken();

const docSections: DocSection[] = [
  {
    id: "setup",
    title: "Quick Start",
    icon: Icon.Goal,
    color: Color.Green,
    content: `# Quick Start Guide
This guide will help you set up the Tidal Raycast extension.
This extension allows you to control Tidal music playback directly from Raycast, with real-time updates and a menu bar toolbox.


## 1. Install Chrome Extension
- Go to the [Releases page](https://github.com/Ek2100/tidal/releases) of this repo.
- Download the latest 'chrome-extension.zip' file.
- Unzip the file to a folder on your computer.
- Open \`chrome://extensions/\` in your browser.
- Enable "Developer mode".
- Click "Load unpacked" and select the unzipped Chrome extension folder.

## 2. Set Up Authentication Token
To securely connect Raycast, the local server, and the Chrome extension, you need a shared authentication token.

### In Raycast Preferences
1. Open Raycast Preferences (\`⌘,\`).
2. Navigate to **Extensions** → **Tidal**.
3. Find the **Local API Auth Token** field.
4. Enter a strong, unique token (for example - you can use the one below):

\`\`\`
${suggestedToken}
\`\`\`

5. **Copy this token** exactly; you will use it in the Chrome extension.

### In the Chrome Extension
1. Click the Tidal extension icon in your browser toolbar.
2. When prompted for authentication, paste the **exact same token** you set in Raycast.
3. Click **Save Token**.

> ⚠️ The token must be identical in both places for communication to work!

## 3. Start the Local Server
- Use the **Start Server** command in the Raycast extension to launch the local API server.

## 4. Open Tidal
- Go to [listen.tidal.com](https://listen.tidal.com) and play music.
- If the connection doesn't work immediately, try refreshing the page.

---

**Important:**

- If you change the token in Raycast, update it in the Chrome extension too.
- After changing the token, restart the server via Raycast's "Stop Server" and then "Start Server" commands.`,
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting",
    icon: Icon.ExclamationMark,
    color: Color.Red,
    content: `# Troubleshooting

## Common Issues

### "Server not responding"
- Run "Stop Server" command
- Run "Start Server" command
- Check port 3049 is free: \`lsof -i :3049\`
- Make sure Node.js is installed: \`node --version\`

### "No track playing"
- Go to listen.tidal.com (not the app)
- Start playing music
- Refresh the page (\`⌘R\`)

### Commands not working
- Check menu bar shows green dot
- Refresh Tidal page
- Restart the server (Stop → Start)

### Extension not working
- Make sure it's enabled in Chrome
- Must be on listen.tidal.com
- Check extension in \`chrome://extensions/\`
- Try disable/re-enable extension

## Chrome Extension Issues

### Extension Not Detecting Tidal
- Ensure Tidal player is visible and active
- Try refreshing both Tidal and server
- Check Chrome extension shows "connected"

### Stale Data Warnings
- Chrome tab may be inactive/backgrounded
- Bring Tidal tab to foreground
- Check Chrome tab sleeping settings
- Restart Chrome if persistent

## Quick Fixes
1. **Restart server** - Stop → Start Server
2. **Refresh Tidal** - \`⌘R\` on Tidal tab
3. **Check connections** - Use Server Status
4. **Clean restart** - Stop server, remove PID file, restart

---

## Further Help

If you continue to have issues or want to report bugs, please open an issue on the [GitHub Issues page](https://github.com/Ek2100/tidal/issues). Include as much detail as possible so we can assist you better.`,
  },
  {
    id: "tips",
    title: "Tips & Best Practices",
    icon: Icon.LightBulb,
    color: Color.Yellow,
    content: `# Tips & Best Practices

## Performance Tips

### Keep Things Active
- **Pin Tidal tab** - Prevents Chrome from sleeping it
- **Keep tab visible** - Background tabs may become inactive
- **Use keyboard shortcuts** - Faster than clicking menu items

### Server Management
- **Monitor status** - Check Server Status if issues arise
- **Clean shutdowns** - Use Stop Server command, not force quit

## Music Control Tips


### Keyboard Shortcuts

* For fastest control **when the menu is open**, use these keys instead of clicking buttons:

  * **Q**: Previous track
  * **W**: Play/Pause
  * **E**: Next track
  * **R**: Like track
  * **T**: Shuffle
  * **Y**: Repeat

* To control Tidal **without opening the menu**, set up **global shortcuts** in Raycast:

  1. Open Raycast Preferences (\`⌘,\`)
  2. Go to **Extensions** → **Tidal**
  3. Assign keyboard shortcuts to the commands you want (e.g., Play/Pause, Next Track)
  4. These shortcuts work anytime, even when the menu is closed



### Menu Bar Usage
- Shows current track at a glance
- Click for quick access to controls
- Status indicator shows connection health

## Troubleshooting Workflow

### When Things Go Wrong
1. **Use 'Server Status' command** - This command provides detailed diagnostics of whats going on with the server and connection.
2. **Restart server** - Use "Stop Server" then "Start Server" commands
3. **If still stuck** - Open an issue on [GitHub](https://github.com/Ek2100/tidal/issues) 


## Security Notes

### Local Server
The local server is designed with security in mind:
- Only binds to localhost (127.0.0.1)
- No external network access
- Automatic cleanup on shutdown
- Uses a secure token for authentication

### Chrome Extension
- Only accesses Tidal domain
- No data collection beyond Tidal
- Does not send data to external servers`,
  },
];

export default function DocsCommand() {
  const [selectedId, setSelectedId] = useState<string>("setup");
  const selectedSection = docSections.find((section) => section.id === selectedId);

  return (
    <List
      isShowingDetail
      onSelectionChange={(id) => {
        if (id) setSelectedId(id);
      }}
    >
      {docSections.map((section) => (
        <List.Item
          key={section.id}
          id={section.id}
          title={section.title}
          icon={{ source: section.icon, tintColor: section.color }}
          detail={
            selectedSection?.id === section.id ? <List.Item.Detail markdown={selectedSection.content} /> : undefined
          }
        />
      ))}
    </List>
  );
}
