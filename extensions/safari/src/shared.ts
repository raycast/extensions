import _ from 'lodash';
import { URL } from 'url';
import osascript from 'osascript-tag';
import { showToast, ToastStyle } from '@raycast/api';

export const executeJxa = async (script: string) => {
  try {
    const result = await osascript.jxa({ parse: true })`${script}`;
    return result;
  } catch (err: unknown) {
    if (typeof err === 'string') {
      const message = err.replace('execution error: Error: ', '');
      if (message.match(/Application can't be found/)) {
        showToast(ToastStyle.Failure, 'Application not found', 'Things must be running');
      } else {
        showToast(ToastStyle.Failure, 'Something went wrong', message);
      }
    }
  }
};

const parseUrl = (url: string) => {
  try {
    return new URL(url);
  } catch (err) {
    return null;
  }
};
export const getTabUrl = (url: string) => {
  const parsedUrl = parseUrl(url);

  // Extract URL from suspended tabs (Tab Suspender for Safari)
  if (parsedUrl && parsedUrl.protocol === 'safari-extension:' && parsedUrl.searchParams.has('url')) {
    return parsedUrl.searchParams.get('url') || url;
  }

  return url;
};
export const getUrlDomain = (url: string) => {
  const parsedUrl = parseUrl(url);
  if (parsedUrl && parsedUrl.hostname) {
    return parsedUrl.hostname.replace(/^www\./, '');
  }
};
export const getFaviconUrl = (domain: string | undefined) => {
  if (domain) {
    return `https://www.google.com/s2/favicons?sz=64&domain=${encodeURI(domain)}`;
  }
};

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const plural = (count: number, string: string) => `${count} ${string}${count > 1 ? 's' : ''}`;

const normalizeText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const search = (collection: object[], keys: string[], searchText: string) =>
  _.filter(collection, (item) =>
    _.some(keys, (key) => normalizeText(_.get(item, key)).includes(normalizeText(searchText)))
  );

// @TODO: This screen should be handled by Raycast itself (https://github.com/raycast/extensions/issues/101)
export const permissionErrorMarkdown = `## Raycast needs full disk access in order to display your Safari bookmarks.

![Full Disk Access Preferences Pane](https://i.imgur.com/3SAUwrx.png)

1. Open the **Security & Privacy** Preferences pane and select the **Privacy** tab
2. Select **Full Disk Access** from the list of services
3. Click the lock icon in the bottom left corner to unlock the interface
4. Enter your macOS administrator password
5. Drag and Drop the icon for the **Raycast** application into the list as seen above`;
