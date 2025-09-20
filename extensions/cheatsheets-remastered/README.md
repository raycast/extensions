# Cheatsheets Remastered

Access a curated collection of [DevHints](https://devhints.io/) cheatsheets plus the ability to create and manage your own custom sheets - all without leaving your keyboard. You can also import Markdown cheatsheets directly from your GitHub repositories and keep them up to date via a built-in Repository Manager. Search is smart and fast, prioritising titles over content so you find what you need instantly.

## Key Features

* Built-in collection of DevHints cheatsheets (audited; outdated sheets archived)
* Create and edit your own custom sheets
* Import `.md` files from your GitHub repositories (optional subdirectory and file/dir exclusions)
* Organise with tags and favourites (including repo-imported sheets)
* One list for everything - built-in, custom, and repository sheets together
* Local storage for offline access; repository sheets can be synced on demand
* Smarter search with title-first matching
* Clickable links back to GitHub for repository sheets
* "Sync All Repositories" action with progress and error reporting

## What Makes It Different

Unlike the original Cheatsheets extension, **Cheatsheets Remastered** comes with cheatsheets ready to use out of the box, no internet required. You can fully customise your own sheets with tags, descriptions, and icons - and now bring in Markdown from your own GitHub repos with fine-grained filtering and a simple sync flow. Repository sheets appear alongside your built-in and custom content, with support for favouriting and quick links back to GitHub.

## Frequently Asked Questions

**Do I need an internet connection?**

No for built-in and custom sheets - they work completely offline. You'll only need internet if you import/sync sheets from GitHub or want to follow links back to GitHub.

**Can I add my own cheatsheets?**

Yes. You can create, edit, tag, and favourite custom sheets directly inside Raycast with full Markdown support, custom icons, and descriptions.

**Can I import from GitHub? What does it fetch?**

Yes. Connect a GitHub token in Preferences and add repositories in the Repository Manager. The extension fetches Markdown (`.md`) files, with optional subdirectory filters and sensible exclusions (e.g. common admin/CI files and folders). You can sync each repo individually or run **Sync All Repositories** from the manager.

**What GitHub permissions are required?**

Use `public_repo` for public repositories; use `repo` if you need to access private repositories. The token is only used to read files during sync.

**Are my custom or imported cheatsheets synced across devices?**

All sheets are stored locally in Raycast's storage. Automatic cross-device sync isn't available yet. Repository sheets can be re-fetched on any device via the Repository Manager after you add the repo and token.

**How does the search work?**

Search prioritises title matches first, then content matches. This means cheatsheets with your query in the title appear before those with it in the content, making results more relevant.

**Where did the "copy cheatsheet" command go?**

It was removed to simplify the command set and reduce redundancy.

## Troubleshooting

**I can't find a cheatsheet.**

Make sure you haven't filtered to a specific type (e.g. "Custom only"). The list now includes built-in, custom, and repository sheets; set the filter to **All** if needed. You can also filter by **Favourites**.

**My custom or repository sheet isn't showing up.**

For custom: ensure it has a title and saved content.
For repositories: confirm your token is set, the repository/branch/subdirectory are correct, and that the file isn't excluded by filters. Try syncing the repo (or **Sync All Repositories**) and check the sync result summary.

**Search feels slow.**

Performance is local and should be fast. If it feels sluggish, try reducing very large Markdown files or limiting how many huge repository docs you sync (images and heavy HTML in Markdown can impact rendering).

**I can't see the built-in cheatsheets.**

Ensure you're not filtered to "Custom only" or "Repository only". Built-in cheatsheets appear when the filter is set to **All** (or includes **Default** items).

**Content import isn't working.**

Repository import requires a GitHub token and network access. Common errors such as authentication failures, rate limiting, or missing branches are reported in the sync summary; fix the stated issue and retry.
