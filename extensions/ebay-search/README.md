# eBay Search for Raycast

Search active and sold eBay listings in your default browser.

| Command                                         | What it searches                                        |
| ----------------------------------------------- | ------------------------------------------------------- |
| **Search eBay**                                 | Active listings for a query you type.                   |
| **Search Sold Items on eBay**                   | Sold listings for a query you type.                     |
| **Search Selected Text on eBay**                | Active listings for text selected in the frontmost app. |
| **Search Sold Items on eBay for Selected Text** | Sold listings for text selected in the frontmost app.   |

Choose **United States** or **Canada** under **Marketplace** in Raycast Settings. Each selected-text command has its own **Use Clipboard Fallback** setting, which is off by default.

The two type-to-search commands show up to seven shared recent queries when the search field is empty. Use the action panel to remove a query or clear the shared history. Reopening a query uses the current command and marketplace.

## Local development

```sh
npm ci
npm run dev
```

Run `npm run build` and `npm run lint` to verify the extension. The build generates the Raycast declarations and checks TypeScript.
