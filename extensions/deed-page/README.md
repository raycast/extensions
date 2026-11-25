# deed.page

Publish a file, a folder, or the HTML on your clipboard to a permanent `https://<name>.deed.page/` URL, then manage your sites from Raycast.

## Commands

- **Publish File or Folder**: uses the file or folder selected in Finder, or one you pick. A single HTML file is served at the site root; a folder keeps its paths. Names that start with a dot, plus `node_modules`, are skipped, and the command stops if the selection is larger than 100 MB. Publishing to a name you already own publishes a new version of that site. The URL is copied when it finishes.
- **Publish Clipboard HTML**: publishes the HTML document or snippet on your clipboard as a new site and copies the URL, after you confirm the first line and size.
- **My Sites**: lists your sites with their live version, size, and last update. Open a site, copy its URL, update it from a file or folder, or delete it (with confirmation).

## Setup

No account or API key is needed. deed.page issues an owner token on your first publish, and the extension keeps it in Raycast's local storage so later publishes, updates, and deletes stay under the same owner. The token is never shown or logged.

If you already publish with deed.page from another tool (for example the token in `~/.config/deed-page/token`), paste it into the **Owner Token** preference to manage those sites here too. A token set in preferences takes priority over the stored one.

## Plans and limits

The Free plan covers 25 sites of 25 MB each and 60 publishes per hour. Free sites are public and show a small deed.page badge. Larger uploads go through deed.page's manifest upload, so they are not limited by a single request size. See [deed.page/pricing](https://deed.page/pricing) and the [API docs](https://deed.page/docs).

Keep your token safe: deed.page stores only a hash of it, and a token with no recovery email cannot be restored.
