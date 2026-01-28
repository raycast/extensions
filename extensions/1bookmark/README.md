# 1Bookmark - Raycast Extension

One Bookmark Solution for Teams and Personal Use.

We support Raycast extension as our top priority client and are developing a web version for cross-platform support.

## Commands

- Search Bookmarks: Search bookmarks and open them. You can also manage all 1bookmark features in this command.
- Add Bookmark: Create a new bookmark.

## What can you do in 1Bookmark?

**Super Easy, Super Simple**
- Manage your bookmarks simply without complicated settings. The intuitive interface makes it easy for anyone to use.
- Find your bookmarks faster than any other tool.

**Manage your team's bookmarks**
- Share and manage bookmarks with your team members. Collaboration becomes easier.
- Of course, we also provide excellent support for personal use.

**Cross-platform**
- Browser independent. Provides the same experience on any browser.

## Sign-Up and Sign-In

Currently, 1bookmark supports email login and there is no separate SignUp process.

When you first enter the Raycast 1bookmark extension, you can log in by entering your email

![login-1](./media/login-1.png)

and then entering the 6-digit code sent to your email.

![login-2](./media/login-2.png)

## Sign-Out

You can sign out by **'My Account'** -> **'Sign Out'** Action in Action Panel.

## Features

- Search and open bookmarks
- Add new bookmarks by one shortcut key
- Share bookmarks with your team
- Filter bookmarks by tags, spaces, and creators
- Import bookmarks from browsers

## Advanced Search Pattern

You can use special characters in your search query to filter results:

- `!space` - Filter by space name. Example: `!raycast api` searches for "api" in the "raycast" space
- `@user` - Filter by bookmark creator name. Example: `@john documentation` searches for "documentation" created by "john"
- `#tag#` - Filter by tag. Example: `#dev# tools` searches for "tools" with the "dev" tag

This allows you to first narrow down your bookmarks by space, creator, or tag, and then find specific items within that filtered set. The filtering and searching are handled by separate systems, making the process more efficient and the results more accurate.

You can combine multiple filters:
- `!raycast #api# @john documentation` searches for "documentation" in the "raycast" space with the "api" tag created by "john"
