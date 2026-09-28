# 1Bookmark Changelog

## [Focus on Search and Add] - 2026-09-28

- 0.15.0
- 📄 The login screen now links to the Terms of Service and Privacy Policy.
- 🔍 The extension now keeps just search and add, in maintenance mode. The 1bookmark Desktop app covers everything it does and is the recommended way to use 1bookmark.
- 💻 The 1bookmark Desktop app is now the main client for everything else. A space now has a single **Manage Space** action (`⌘M`) that opens a short note with a link to the Desktop app download page, and the **Import Bookmarks** command does the same.
- 📥 Importing bookmarks from browsers moved to the Desktop app, so the browser importer is no longer bundled with the extension.
- 👤 **Add Account** in My Account and **Add New Space** (`⌘N`) in the Spaces view point to the Desktop app as well.
- 💻 The **Spaces** and **My Account** views now start with a **Try the 1bookmark Desktop App** item that opens the Desktop app download page.
- 📱 The bookmark detail panel (**Show/Hide Details**) is removed to keep the search list simple.
- 👥 The **Spaces** view still enables and disables spaces for search, since that is specific to your Raycast session.
- 🔐 Per-space email re-authentication is gone. A space's email policy now only decides who can join it, so once you are a member its bookmarks always show up — sign in with the account that belongs to the space instead.
- 🔍 Tag subscription is removed. The search list is no longer split into tagged/untagged sections, so every bookmark is ranked together. The tag dropdown in the search bar is gone as well.
- 🔍 Search now matches tag names too. A bookmark whose tag matches your keyword now appears in the results instead of being missed. Tag-only matches rank below name/URL matches, but a bookmark you often pick for that keyword can still move up, just like any other result. Tags add no ranking bonus, and bookmarks without tags are never penalized.

## [Subscribed Tag Check Icon] - 2026-08-30

- 0.14.0
- 👥 Team spaces now have a **Copy Invitation Link** action (`⌘I`). Share the link and teammates can join the space directly from the web after signing in.
- 🌐 Space owners are directed to the web to change space settings or delete a space.
- 💅🏼 Subscribed tags now show a check icon in the space tags list.
- 🐛 Cached bookmarks now carry a schema version. Caches from incompatible versions are refetched instead of causing unexpected behavior, and the cache from earlier versions is kept usable while offline.
- 🐛 When bookmarks cannot be loaded and nothing is cached, the search command now shows a retry state instead of loading indefinitely.
- 🐛 Network failures now show a clear cached-data notice.
- 🐛 Search results now always select the top item as you type, instead of sticking to a previously selected item that moved down.

## [Bookmark Detail View and UX Improvements] - 2026-07-06

- 0.13.0
- 📱 Bookmark detail view is now available. Toggle it with the **Show/Hide Details** action.
- 📱 Add Bookmark now loads the page title automatically when you enter a URL.
- 🔍 Tag filter is simplified to a single `#tag` prefix. Use `##` to search for a literal `#`.
- 💅🏼 Space icon emoji input is now supported, including keycap and flag emojis.
- 👥 Spaces now support read-only (READ) members.
- 👥 Team spaces can now set a Slack team ID.
- 🐛 Show a friendly error message when registering a duplicated bookmark URL.
- 🐛 Signing out now clears all user-scoped caches completely.
- 🐛 When your session is revoked (e.g. account deleted or session removed on the website), the extension now returns to the login view instead of showing errors.
- 💻 Favicons are now resolved on the client and persisted, improving list rendering.
- 💻 Internal tooling migrated from npm to pnpm, plus several cleanups and fixes.

## [HotFix Login bug] - 2026-04-13

- 0.12.1
- 🐛 Fix login bug in Raycast Extension.

## [Login through the 1Bookmark website] - 2026-04-13

- 0.12.0
- 🌐 1Bookmark web client (Beta) is now available at [1bookmark.net](https://1bookmark.net). All features from the Raycast Extension will be available on the website, and some new features may be exclusively offered on the web.
- 🔑 You can now sign in to Raycast Extension through the 1Bookmark website.
- 💻 Updated Raycast API, Raycast Utils, tRPC and React packages.

## [Improve Space Authentication UX] - 2025-05-23

- 0.11.1
- 📱 Before modifying a space auth policy, check that the current account is compliant with the policy and then reject the policy modification. This prevents you from accidentally modifying the policy and losing access to the space.
- 📱 You can edit the nickname and image for each space.

## [Space Authentication Policy] - 2025-05-19

- 0.11.0
- 📱 Space member email auth policy is now available. This feature enhances the security of your team space.
- 📱 Form validation has been improved.
- 💻 There have been several small bug fixes and performance improvements.
- 📝 Rename title from 1bookmark to 1Bookmark.

## [Index Ranking System] - 2025-04-25

- 0.10.0
- 📱 Index ranking is now available. It boosts bookmarks that are more relevant to the search keyword.

## [Per-Device Enable/Disable Spaces] - 2025-04-08

- 0.9.0
- 📱 Space enable/disable feature is now available. This feature allows you to access only the spaces you are interested in on a per-device basis.
- 📱 Add a feature to leave a space. You may leave a space at any time, except in the following cases:
    - You can't leave a private space
    - When there is only one space owner, the owner cannot leave the team.
- 💻 Fix and refactor many codes to be more readable, stable.

## [Pattern Search by Space, Creator, Tag] - 2025-04-01

- 0.8.0
- 📱 Space, creator, tag filter pattern is now supported.
    - `!space` - Filter by space name. Example: `!raycast api` searches for "api" in the "raycast" space
    - `@user` - Filter by bookmark creator name or email. Example: `@john documentation` searches for "documentation" created by "john"
    - `#tag#` - Filter by tag. Example: `#dev#tools` searches for "tools" with the "dev" tag

## [Improve Performance] - 2025-03-28

- 0.7.1
- 💻 Remove `jotai` which causes unnecessary re-renders in raycast environment.
- 💻 Fix some infinite re-render issue.

## [Improve Search UX] - 2025-03-19

- 0.7.0
- 💻 Replace search library from `minisearch` to `fuzzysort`. So fuzzy search is now more accurate.

## [New Command: Import Bookmarks] - 2025-03-14

- 0.6.0
- 📱 **Import Bookmarks** command added. It supports importing bookmarks from browsers.
  Thanks to **Browser Bookmarks** contributors. Many codes from that extension are reused.

## [Sign In UX Improvement] - 2025-03-04

- 0.5.1
- 📱 Sign in UX improvement. We no longer clear tokens when there is a simple network error.
- 💻 The code for determining whether or not a user is signed out has been neatly organized.

## [Space Detail View and Official Domain] - 2025-03-04

- 0.5.0
- 📱 Space detail view is now available.
- 🌐 Service's official domain `1bookmark.net` is now used.

## [Improve Code Quality and Fixed Some Bugs] - 2025-02-28

- 0.4.2
- 💻 Improved code quality and fixed some minor bugs.

## [Improve UI and UX] - 2025-02-28

- 0.4.1
- 💅🏼 Apply Raycast style, shortcut conventions for actions.
- 💅🏼 All Actions have icon.
- 📱 All items in Search Bookmarks has go to My Account action.
- 👥 Add **Remove user from space** action.

## [Added My Account UI, Improved Sign In/Out UX] - 2025-02-28

- 0.4.0
- 💅🏼 Added UI to my account view.
- 👥 Spaces list is now sorted by type and name.
- 🇺🇸 Changes all Korean text to English in the extension codes.
- 📱 Improve UX for sign in and sign out, fix sign out bugs.

## [Improve Login UX] - 2025-02-28

- 0.3.4
- 💅🏼 The issue of having to re-enter email after seeing the login code has been resolved.

## [Prepare for Production] - 2025-02-28

- 0.3.3
- 💻 Prepare for production build using Raycast Extension default settings.

## [Fix Preferences Issue and Improve README Guide] - 2025-02-28

- 0.3.2
- 🐛 Fix about raycast preferences bug in production build.
- 📚 Add Sign-Up, Sign-In, Sign-Out and **'What can you do in 1Bookmark?'** guide in README.

## [Support Tag and URL Search] - 2025-01-29

- 0.3.0
- 🏷️ Support filter by tag.
- 🔍 Add url as a search field.
- 💻 Check `npx ray build -e dist` for production publish.

## [Add Screenshots] - 2025-01-23

- 0.2.3
- 📸 Add screenshots shown in extension store description.
- 💻 Improve publish to production workflow.

## [Hide incomplete features] - 2025-01-20

- 0.2.2
- 💻 Enhance some code quality, CI test.

## [Hide incomplete features] - 2025-01-19

- 0.2.1
- 🏗️ Hide incomplete features.

## [Now Supporting Only Logged-In Users] - 2025-01-19

- 0.2.0
- 👤 Only support logged in user by removing Onboarding view.

## [Public Store Release] - 2025-01-18

- 0.1.0
- 🎉 1Bookmark is now available on the public store.
- 💻 Service is open beta until February 2025.

## [Initial Version] - 2024-09-08

- Initial version
