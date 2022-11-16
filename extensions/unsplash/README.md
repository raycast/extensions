<p align="center">
  <img src="assets/command-icon.png" height="128">
   <h1 align="center">Unsplash</h1>
</p>

A [Raycast](https://raycast.com/) extension that lets you communicate with Unsplash's API and gives you access to some functions.

<p align="center">
   <video src="https://user-images.githubusercontent.com/13917975/151459995-19c353cf-33b2-427c-b50b-2670bc059566.mp4" />
</p>

### Configuration

You will need some additional steps to install this plugin.

- Unsplash API key, you can get one from [here](https://unsplash.com/developers) (only the "Public access" permission is enough)
- Install the extension from [Raycast Store](https://www.raycast.com/eggsy/unsplash)
- Type `Unsplash` to display all available options
- Choose one and fill in the blanks with the details
  - **Access Key**: Your Unsplash API key (**required**)
  - **Username**: Username of the person you want to list likes of.
  - **Orientation**: The orientation of the images on results. (Default: `all`)
  - **Download Size**: The sizes when downloading, copying, and saving image to disk. (Default: `full`)
  - **Custom Collections**: The collection IDs you want to get random images out of while setting a random wallpaper. The list should be comma & space seperated as in `ID1, ID2, ID3, etc.`. (Default: [`4324303`](https://unsplash.com/collections/4324303), [`8647859`](https://unsplash.com/collections/8647859), [`298137`](https://unsplash.com/collections/298137), [`2476111`](https://unsplash.com/collections/2476111), [`1065976`](https://unsplash.com/collections/1065976), [`3430431`](https://unsplash.com/collections/3430431), [`1114848`](https://unsplash.com/collections/1114848), [`2063295`](https://unsplash.com/collections/2063295), [`9389477`](https://unsplash.com/collections/9389477), [`932210`](https://unsplash.com/collections/932210))
  - **Include Default Collections**: When you set custom collections, you can choose to include the default collections as well. (Default: `no`)
  - **Wallpaper Path**: The folder to store wallpapers. (Default: `~/Library/Application Support/com.raycast.macos/extensions/unsplash/`)

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

More? Feel free to create an **issue**!
