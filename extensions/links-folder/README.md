# Links Folder

Browse link folders and open all links in a folder at once—like a browser favorites bar.

## How it works

1. Run the **Links Folder** command in Raycast.
2. You see a list of **folders** (e.g. Work, Development, Reading).
3. Select a folder and press **Enter** (or choose **Open All Links**) to open every link in that folder in your default browser.
4. You can also open a single link via the action panel (⌘ + link).

## Configuring links

Links are defined in a JSON file. By default the extension uses `assets/links.json` in this project.

### JSON format

```json
{
  "folders": [
    {
      "id": "work",
      "name": "Work",
      "links": [
        { "title": "Gmail", "url": "https://mail.google.com" },
        { "title": "Slack", "url": "https://slack.com" }
      ]
    }
  ]
}
```

- **folders**: array of folder objects
- **id**: unique string (e.g. `"work"`)
- **name**: label shown in the list (e.g. `"Work"`)
- **links**: array of `{ "title": "...", "url": "..." }` objects

### Custom links file

In **Raycast → Preferences → Extensions → Links Folder**, you can set **Links JSON File** to the path of your own JSON file. If set, that file is used instead of the default `assets/links.json`.

## Development

- `npm run dev` — run the extension in development mode with hot reload
- `npm run build` — build for production
