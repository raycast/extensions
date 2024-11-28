# KeepassXC Extension Changelog

## [Fix] - 2023-10-23

- Fixed a logic bug

## [Enhancement] - 2023-10-21

- Added Open URL action
- Optimize performance: Using LocalStorage to cache entries and load entries from cache to improve load speed

## [Fixes] - 2023-10-03

- New feature/action "Paste TOTP" so as to be more productive
- Respecting the KeePassXC shortcut logic as much as possible since cmd + P isn't an available custom shortcut anymore for extensions
- Giving a tempory solution for the "Copy Password" (why? when the password contains a backslash, that action fails due to AppleScript in the protectedCopy function)
- Updating the README.md accordingly
- Using the build in Clipboard.Copy's concealed type 

## [Fix] - 2023-06-20

- Fixed a logic bug

## [Enhancement] - 2023-05-23

- New feature/action "Paste Username" so as to be more productive;
- Improving the shortcut logic (e.g. cmd+u for copy the username instead of cmd+b);
- Using more explicit action names (e.g. Paste Password instead of Paste)
- Updating the README.md accordingly.


## [Enhancements] - 2022-09-27

Adds the ability to hide passwords and OTPs from clipboard managers

## [Add support for Key File protected Database file] - 2022-07-27

- Add support for Key File protected Database file
- Bump api version to 1.38.1