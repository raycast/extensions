# Chrome Profile Links

Save links that open in a specific Google Chrome profile.

Raycast's built-in quicklinks can open a URL in Google Chrome, but they cannot choose **which profile** to use. Profile switchers can open a profile, but not a specific URL inside it. This extension does both.

## Commands

### Create Profile Link

Save a URL together with the Chrome profile it should open in.

- When Google Chrome is open, the URL, page title and current profile are filled in from the active tab.
- Choose **Ask Every Time** to pick the profile each time you open the link.
- Add optional **tags** (comma-separated) to group and find links.
- You are warned before saving the same URL twice for the same profile.

Tip: assign a hotkey to this command to save the current Chrome tab in one keystroke.

### Search Profile Links

Search your saved links and open them in their Chrome profile.

- Each link shows the site's favicon, its tags, and the profile's name and picture.
- Search by name, URL, profile name or tag, or use the dropdown to filter by profile, tag, or saved links vs. bookmarks.
- Links you open often and recently are listed first.
- **Chrome Bookmarks**: bookmarks from every profile are listed alongside your links, always in sync with Chrome, and open in the profile they belong to. Bookmark folders work like tags. You can turn this off in the command preferences.

| Action                    | Shortcut |
| ------------------------- | -------- |
| Open in Profile           | `⏎`      |
| Open with Another Profile | `⌘ ⏎`    |
| Copy URL                  | `⌘ ⇧ C`  |
| Edit Link                 | `⌘ E`    |
| Duplicate Link            | `⌘ D`    |
| Create Profile Link       | `⌘ N`    |
| Add to Root Search        | `⌘ ⇧ Q`  |
| Delete Link               | `⌃ X`    |

## Open Links From Root Search

- **Add to Root Search** (`⌘ ⇧ Q`) turns a link into a Raycast quicklink, so you can open it by typing its name in root search and give it an alias or hotkey.
- Or enable **Search Profile Links** as a fallback command (Raycast Settings → Extensions → Chrome Profile Links) to search your links with whatever you typed in root search.

## Permissions

The first time you use the extension, macOS may ask you to allow Raycast to:

- **Control Google Chrome** — to read the URL and title of the active tab when creating a link.
- **Control System Events** and use **Accessibility** — to detect which profile the front Chrome window belongs to. Without it, the last used profile is selected instead.

Opening links works without any of these permissions.

## How It Works

Profiles are read from Google Chrome's `Local State` file and bookmarks from each profile's `Bookmarks` file in `~/Library/Application Support/Google/Chrome`. Links are opened with:

```sh
open -na "Google Chrome" --args --profile-directory="Profile 1" "https://example.com"
```

The current profile is detected from the front window's title, which Chrome suffixes with the profile name when you have several profiles.

Saved links are stored locally in Raycast and never leave your Mac.

## Limitations

- Only Google Chrome is supported.
- Recent Chrome versions may store a profile's bookmarks only in encrypted form. Those bookmarks cannot be read and are not listed.

## Requirements

- macOS
- Google Chrome
