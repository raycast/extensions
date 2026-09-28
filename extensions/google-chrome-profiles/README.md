<p align="center">
    <img src="./assets/command-icon.png" alt="extension icon" width="200px" />
</p>

<h1 align="center">Google Chrome Profiles</h1>

<p align="center">
    View your Google Chrome profiles, show bookmarks, open the right profile.
</p>

## Why

Profiles in Chrome are absolutely awesome. It allows to keep your browsing experience (bookmarks, navigation history, passwords, and other settings) separated by company / perso / pro / whatever.

Problem: jumping from a profile to another is painful.

Here comes this extension:

Hit `⌘ ⇧ M`, choose the right profile, hit `Enter ↵`, and tada 🎉

![jump from profile to profile](https://user-images.githubusercontent.com/2499356/146406690-e1e79b29-5e22-4764-ad32-daccb598975b.jpg)

## How it works

When the extension opens, it lists all your existing profiles.

> Hit `Enter ↵` to enter a profile's bookmarks, `⌘ ↵` to open (or focus) the profile chrome window, or `⌘ ⇧ ↵` to open a new window for the profile.

When entering a profile, you can choose whether:

- open a new window
- open a new blank tab
- filter the bookmarks and/or open a bookmark
- search the input text in the search engine of your choice (cf. settings)
- open the URL in the clipboard (if any of course) in a new tab

> Hit `Enter ↵` to open the selected item and close the Raycast main window, or `⌘ ↵` to open the selected item and keep Raycast opened.

![show profile bookmarks](https://user-images.githubusercontent.com/2499356/182669098-0adfd17f-b586-4820-bebf-85e5ec49cd39.jpg)

## Move the current tab

Run **Move Current Tab to Another Profile** while a regular Chrome window is open. With two profiles, it moves the current tab to the other profile automatically. With more profiles, choose a destination from the list. You can assign this command its own hotkey in Raycast.

The command opens the URL in the destination profile, reusing an existing matching tab when possible, then closes the original tab. It keeps the original tab if the destination cannot be confirmed or the source URL has changed. Page state, such as unsaved form input, is not transferred. Incognito tabs are not supported.

Profile switching and tab moves use Raycast's Accessibility and Automation permissions for Chrome and System Events. If ordinary profile switching cannot use the menu, it falls back to opening the profile directly. Tab moves require menu access to identify and verify the destination profile.

## Hotkey (recommended)

I highly recommend that you map the default Google Chrome profile shortcut (`⌘ ⇧ M`) to open this extension. Like so:

![command shortcut](https://user-images.githubusercontent.com/2499356/182660159-9b373fe9-f9df-4edd-953d-925308c61b3e.jpg)

## Settings

If needed, set the URL for the new tab (default is `about:blank`) and your search engine in the extension setting (default is `google.com`).

![extension setting](https://user-images.githubusercontent.com/2499356/182661111-b53372fa-ff38-4134-934d-c2cb65fc367e.jpg)
