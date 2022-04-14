# GIF Search

This extension searches for animated GIFs from the internet using [giphy.com](https://giphy.com), [tenor.com](https://tenor.com), or [thefinergifs.club](https://thefinergifs.club). Switch between the various services using the search bar dropdown.

## Issues or Feature Requests

Find a bug? Want to see something new in this extension? Let me know by [submitting a feature request](https://github.com/raycast/extensions/issues/new?assignees=&labels=extension%2C+feature+request&template=extension_feature_request.md)! Make sure to either mention `@josephschmitt` in your ticket or set me as the assignee so I get notified.

## Preferences

### Changing the Default Action

You can change what the default action on a GIF is in order to customize what happens when you hit ENTER. This setting allows you to change the behavior to one of several options:

![Default Action](./media/default-action.png)

1. Copy GIF (Default): Copies the GIF file itself to your Clipboard
1. Copy GIF Link: Copies the URL to the GIF file to your Clipboard
1. Add or Remove from Favorites
1. View GIF Details: Opens the GIF Details view with extra metadata about the GIF
1. Copy Page Link: Copies the URL to the page the GIF is hosted on to your Clipboard
1. Open in Browser: Opens the URL to the page the GIF is hosted on in your browser

Whichever setting is chosen will be moved to the top of the list, making it the default action when you hit ENTER on the GIF list item.

### Toggling the GIF Preview

The extension shows a preview of the animated GIF on the right-hand side as you highlight a search result. If you want to disable this option, uncheck the "Show GIF Preview" preference. You can still view full GIF Details by choose the "View GIF Details" Action on any GIF whether the preview is enabled or not.

### Customizing the Number of Results

By default, only 10 results are returned for any GIF search (with no option to load more, currently). If you wish to see more results, you can change the "Max Results" preference to any integer you like. Note that the more results you choose to return the slower that searches will be.

### Custom API Keys

By default, this extension will download shared API keys for both services. If you wish to use your own API keys, you can sign up for a free developer account for Giphy at [https://developers.giphy.com](https://developers.giphy.com), or Tenor at [https://tenor.com/developer/keyregistration](https://tenor.com/developer/keyregistration), and provide those keys in the Command Preferences.
