<p align="center">
  <img src="assets/command-icon.png" height="128">
  <h1 align="center">Unsplash</h1>
</p>

A [Raycast](https://raycast.com/) extension that lets you communicate with Unsplash's API and gives you access to some functions.

<p align="center">
   <video src="https://user-images.githubusercontent.com/13917975/151459995-19c353cf-33b2-427c-b50b-2670bc059566.mp4" />
</p>

### Installation

You will need some additional steps to install this plugin.

- Create an app on [Unsplash developers page](https://unsplash.com/developers).
- Copy your access key and secret key.
- Scroll down to the "Redirect URI & Permissions" section:
  - Set the "Redirect URI" field to: `https://raycast.com/redirect`
  - Choose "Public access", "Write likes access" and "Read user access" permissions.
  - It should look [like this](https://i.imgur.com/ZV6G9mi.png).
- Save your settings.
- Install the Unsplash extension.
- Enter your access key and secret key in the extension settings.
- When you run a command for the first time you'll be asked to authorize.

### FAQ

---

**Q:** Why does it ask for a permission when setting a desktop wallpaper?

**A:** If you haven't granted Raycast the permission to change your desktop wallpaper, this extension will ask for it once.

---

**Q:** Where does it save the downloaded images?

**A:** It uses your Application Support directory as default, which should be at `~/Library/Application Support/com.raycast.macos/extensions/unsplash/`.

---

**Q:** I set "Download Size" option to a different value but it's always downloading the same images!

**A:** Well, if Unsplash doesn't return an image URL for the value you selected, or if it returns the same image for all values, the extension simply downloads it. If it's not found, extension will fallback to another value.

---

**Q:** Couldn't set the wallpaper using "Set Random Wallpaper" because I rejected the permission request!

**A:** If you accidentally rejected the initial permission request window, or didn't realize it was from this extension, you'll have to go to your **System Preferences > Security & Privacy > Privacy > Automation** and grant/tick the **System Events** permission to Raycast.

---

**Q:** Why do we need to authorize?

**A:** This enables us to get a bearer token with permissions that'll let us access more features of the Unsplash API (e.g. like, dislike, get current user).

---

**Q:** Why am I running out of API calls so quick?

**A:** The extension implements pagination so each "page" counts as another API call. To minimize your use of requests, try a different search query if the first couple of pages do not meet your needs.

---

More? Feel free to create an **issue**!
