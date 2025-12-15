# rlog

A frictionless, public reading log manager that lives in your keyboard.

**rlog** (reading log) is a publicly shareable record of everything you read online. It's designed for developers and writers who want to track and share their reading on their personal blogs without the friction of traditional reading trackers.

## Features

- **Smart Browser Integration**: Automatically detects and fetches the URL from your active browser tab (Chrome, Safari, Firefox).
- **Log Read**: Instantly add the current article to your 'read' history (`reading.json`).
- **Read Later**: Save articles to your private queue (`reading_list.json`).
- **Log Window**: Bulk-save **all open tabs** in the active window to your public history.
- **Read Window Later**: Bulk-save **all open tabs** to your private queue.
- **Auto-Metadata**: Fetches Title, Author, and Date from the URL automatically.
- **View Read Log**: Open a window showing your reading history.
- **View Reading List**: Open a window showing your saved “read later” items.
- **Open Random Article**: Open a random article from your reading list in the browser.
- **Blog Setup**: One-click setup to inject the reading list page into your Next.js app.
- **Git Integration**: Optionally commit and push changes to your blog's repository immediately.

## Configuration

Go to Raycast Preferences → Extensions → rlog, then set:
- **Blog Repository Path**: Absolute path to your blog repo (e.g., `/Users/you/projects/my-blog`).
- **Data File Path**: Relative path to the JSON file for your main reading log (default: `data/reading.json`).

## Privacy

rlog is **local-first and privacy-focused**:
- All data is stored locally on your machine.
- No data is sent to external servers (unless you use "Push to Git", which sends to *your* repo).

## License

MIT
