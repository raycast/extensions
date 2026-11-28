# Fileion

Search software, tools, Q&A and articles on [Fileion.Com](https://fileion.com) from Raycast and see its latest version on each platform, the release date, the publisher and what Fileion checked about the download.

## Commands

- **Search Fileion**: one search for software, tools, Q&A and articles. Type at least two letters. Results are grouped in sections (Software, Tools, Q&A, Articles), and the dropdown in the search bar filters All, Software, Tools, Q&A or Articles (Raycast remembers your choice). Every result has a preview panel:
  - **Software**: the title's own logo, the latest version and date for each platform (for example "3.0.24 · Sep 21, 2026"), the publisher, and the "Fileion checks" line (for example "3 of 5" checks and the VirusTotal result with its date). **Download for Mac** (Enter) comes first when the title has a Mac version, then Windows, Linux, Android and iOS for each platform it has; each opens Fileion's own download page for that platform, never a vendor file. **Open on Fileion**, **Copy Fileion URL** (⇧⌘C) and **Open Versions Page** (⌥⌘V) are there too.
  - **Tools**: the tool's icon, its short description, its category and an "Open tool" link. Enter opens the tool on Fileion.Com.
  - **Q&A**: the question and its excerpt, the answer count, an "Accepted" tag, the excerpt of the accepted (or top) answer, and the date.
  - **Articles**: the featured image, an excerpt, the author, the date and the reading time.
  - For tools, Q&A and articles, Enter opens the page on Fileion.Com and ⌘K → **Copy Link** copies it.
- **Recent Updates**: what is new on Fileion.Com, newest first, in sections: software versions (grouped by day, with the same logos and download actions, the platform of the update first), tools (last updated), Q&A and articles. The dropdown shows All, Software, Tools, Q&A or Articles (Raycast remembers it). Every row has the same preview panel as Search Fileion.
- **Latest Articles**: the newest Fileion blog posts and news, newest first. Use the dropdown to show All Articles, Blog or News, and the search bar to search titles; Enter opens the article, ⌘K → Copy Link.

## Good to know

- Every link goes to Fileion.Com. The extension never links to a vendor's file.
- The numbers say what Fileion.Com checked and when. They are not a promise about the file.
- It uses Fileion's free public API (read-only). Free use has a limit per address; a free API key raises it (create one at https://developers.fileion.com/keys and put it in the extension's preferences).
- No account, no tracking. Only the text you type in the search box is sent to fileion.com.

## Developers

Building something with Fileion's data? The API, the MCP server and the badges are documented at https://developers.fileion.com.
