import { URL } from 'url';

export const getUrlDomain = (url: string) => new URL(url).hostname.replace(/^www\./, '');
export const getFaviconUrl = (domain: string) => `https://www.google.com/s2/favicons?sz=64&domain=${encodeURI(domain)}`;

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const plural = (count: number, string: string) => `${count} ${string}${count > 1 ? 's' : ''}`;

// @TODO: This screen should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)
export const permissionErrorMarkdown = `## Raycast needs full disk access in order to display your Safari bookmarks.

![Full Disk Access Preferences Pane](https://i.imgur.com/3SAUwrx.png)

1. Open the **Security & Privacy** Preferences pane and select the **Privacy** tab
2. Select **Full Disk Access** from the list of services
3. Click the lock icon in the bottom left corner to unlock the interface
4. Enter your macOS administrator password
5. Drag and Drop the icon for the **Raycast** application into the list as seen above`;
