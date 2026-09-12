# Tidal Raycast Integration

This project seamlessly integrates your Tidal web player with Raycast, allowing you to control music playback and view currently playing tracks directly from your macOS menu bar. This guide will walk you through the setup process step-by-step.

## 🚀 Getting Started: Your Detailed Setup Guide

Follow these instructions carefully to get your Tidal Raycast integration up and running.

### Step 1: Install the Chrome Extension

This component allows Raycast to communicate with your Tidal web player in the Chrome browser.

1.  **Download the Extension:**
    *   Open your chromium browser and navigate to the official release page: [https://github.com/Ek2100/tidal/releases/tag/chrome-extension](https://github.com/Ek2100/tidal/releases/tag/chrome-extension)
    *   On the page, locate the first release labeled `chrome-extension.zip`. Click on the link to download the file to your computer or click [this link](https://github.com/Ek2100/tidal/releases/download/chrome-extension/chrome-extension.zip) to download it directly.
2.  **Unzip the Downloaded File:**
    *   Once downloaded, go to your Desktop (or wherever your browser saves downloads).
    *   Find the `chrome-extension.zip` file.
    *   Double-click the `.zip` file. This will create a new folder, named `chrome`, containing the extension's files.
    *   **Important:** Remember where this unzipped folder is located, as you'll need to select it in a moment.
3.  **Open Chrome Extensions:**
    *   In your Chrome browser, type `chrome://extensions/` into the address bar (where you usually type website URLs) and press Enter.
4.  **Enable Developer Mode:**
    *   On the Chrome Extensions page, locate the "Developer mode" toggle switch in the top right corner of the window. Click this toggle to turn it on.
5.  **Load the Unpacked Extension:**
    *   In the top-left corner of the Chrome Extensions page, a new button labeled "Load unpacked" will now be visible. Click this button.
    *   A file selection window will now appear.
    *   Navigate to and select the unzipped folder you created in step 2 (the `chrome` folder).
    *   Click "Open."
6.  **Verify Installation:**
    *   You should now see "Tidal Controller" listed among your Chrome extensions. If it's there, you have successfully completed Step 1!

### Step 2: Configure Authentication in Raycast and Chrome

This step establishes a secure connection between your Raycast extension and the Chrome extension using a unique password (also called a "token"). This ensures your Tidal information remains private.

1.  **Activate Menubar Command in Raycast:**
    *   Open Raycast.
    *   Run the command `activate menubar`. This command will prompt you to enter a strong and unique password.
2.  **Generate and Enter Your Password:**
    *   It is crucial to use a **strong and unique password** that you do not use for any other service. You can use a strong password generator like [Proton Pass](https://proton.me/pass/password-generator) to generate one.
    *   **Paste that password into Raycast** when prompted by the `activate menubar` command.
3.  **Enter the Same Password in the Chrome Extension:**
    *   Next, open your Chrome browser.
    *   Click on the "Tidal Controller" extension icon in your browser's toolbar (usually near the address bar).
    *   A window titled "authentication required" will appear. **Enter that exact same password** you just pasted into Raycast into this window.
    *   The way this extension works is by getting Raycast to start a local HTTP server on your computer for the Raycast extension and Chrome extension to communicate through. The token you use is necessary to ensure that your Tidal information, such as the tracks you are listening to right now, stays safe and sound.
4.  **Verify Menubar Status:**
    *   After completing the password setup in both Raycast and the Chrome extension, look at your computer's menu bar (at the top of your screen on macOS).
    *   You should see it say either 'Tidal' or 'Offline'. If it says 'Tidal', congratulations, you are nearly ready! If it says 'Offline', proceed to Step 3.

### Step 3: Start the Local Communication Server (If Needed)

This step is only necessary if your menu bar says 'Offline'. This means the local communication server, which allows your extensions to talk, isn't running yet.

1.  **Check Menubar Status:**
    *   If your menubar says 'Tidal', congratulations, you are done and can start streaming!
    *   However, if your menubar says 'Offline', there is one more step.
2.  **Start the Server:**
    *   Click on the 'Offline' text in your menubar.
    *   In the submenu that appears, click on 'Server'.
    *   Then, click 'Disconnected (click to start)' to initiate the local server.
    *   Refresh your Tidal web player page in Chrome.

If your menubar says 'Offline', that means that your server to communicate with the Chrome extension isn't launched. However, please be assured that we do not share or collect any data.

**Congrats, you are now streaming!** Your menubar will show currently streaming as well as controls.

---

## How It Works

This integration uses a secure, local communication method to connect your Raycast commands with your Tidal web player.

*   **Chrome Extension:** This small program runs within your Chrome browser, specifically on `listen.tidal.com`. It monitors the currently playing track and sends this information to a local communication server running on your computer. It also receives playback commands (like play/pause or skip) from this server.
*   **Local Communication Server:** This is a lightweight program that the Raycast extension starts on your computer. It acts as a secure bridge. The Chrome extension sends its updates to this bridge, and when you use a Raycast command, Raycast sends that command to this same bridge. The bridge then forwards the command to the Chrome extension. This server operates entirely on your local machine (`localhost`) and does not connect to the internet or send any data externally.
*   **Raycast Extension:** This is your primary interface. It fetches real-time track data from the local communication server to display in your menu bar. When you use a Raycast command, it sends that command to the local server, which then relays it to the Chrome extension.

**Security:** All communication between these components is protected by the unique password (authentication token) you set up. This ensures that only your authorized extensions can interact, keeping your Tidal listening information private and secure on your own device. No data is collected or shared externally.

## Troubleshooting

If you encounter any issues, try these common solutions:

*   **"Server not responding" or "Offline" status:**
    *   In Raycast, try running the "Stop Server" command, then the "Start Server" command again.
    *   Ensure Node.js is installed on your computer. You can check by opening your computer's Terminal and typing `node --version`.
*   **"No track playing" or commands not working:**
    *   Confirm you are on `listen.tidal.com` (the web player) and that music is actively playing.
    *   Refresh the Tidal page in your browser (`⌘R`).
    *   Check your menu bar to ensure it says "Tidal" and not "Offline"
*   **Chrome Extension issues:**
    *   Go back to `chrome://extensions/` and make sure "Tidal Controller" is enabled.
    *   Ensure the Tidal tab in Chrome is visible and active. Sometimes, Chrome's "Memory Saver" feature can put background tabs to sleep, preventing updates. Try bringing the Tidal tab to the front.
    *   Try disabling and then re-enabling the "Tidal Controller" extension.

For more detailed information about what's happening, you can use the "Server Status" command in Raycast.

## Tips & Best Practices

*   **Keep Tidal Active:** To ensure smooth, continuous updates, consider pinning your Tidal tab in Chrome. This helps prevent the browser from putting it to sleep.
*   **Keyboard Shortcuts:**
    *   When the Raycast menu is open, you can use `Q` (Previous), `W` (Play/Pause), `E` (Next), `R` (Like), `T` (Shuffle), `Y` (Repeat) for quick controls.
    *   For controls that work even when the Raycast menu isn't open, set up **global shortcuts** in Raycast Preferences (`⌘,` → Extensions → Tidal).
*   **Menu Bar:** The menu bar icon is your quick glance at what's playing and the connection status.

## Contributing

If you're interested in looking at or helping improve the code, you can get a copy of this project. Please note that if you contribute to the Raycast extension part, those changes should also be made on the official [Raycast Extensions page](https://www.raycast.com/store/extensions).

```git clone https://github.com/Ek2100/tidal.git```


## Issues

If you find any problems or have ideas for improvements, please flag them by opening an issue on the [GitHub Issues page](https://github.com/Ek2100/tidal/issues).