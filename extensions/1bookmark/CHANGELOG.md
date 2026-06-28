# 1Bookmark Changelog

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
