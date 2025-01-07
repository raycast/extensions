# KeepassXC Extension Changelog

## [Enhancement] - {PR_MERGE_DATE}

- Add a timer to lock the database after a user specified time of inactivity
- Remove the password and the key file fields from the extension preference
- Add TOTP indicators and usernames while searching entries
- Add a folder filter on the search bar when folders exist in the database
- Use the official KeePassXC.app icon as the extension icon
- Use `keepassxc-cli export` to retrieve entries and most other data from the database instead of relying heavily on `keepassxc-cli show`
- Update the README.md
- Update the screenshots
- Comment the code

## [Fix] - 2023-10-23

- Fix a logic bug

## [Enhancement] - 2023-10-21

- Add Open URL action
- Optimize performance: Using LocalStorage to cache entries and load entries from cache to improve load speed

## [Fix] - 2023-10-03

- New feature/action "Paste TOTP"
- Respect the KeePassXC shortcut logic as much as possible since `cmd - p` isn't an available custom shortcut anymore for extensions
- Fix "Copy Password" when the password contains a backslash
- Update the README.md
- Use the build in Clipboard.Copy's concealed type

## [Fix] - 2023-06-20

- Fix a logic bug

## [Enhancement] - 2023-05-23

- New feature/action "Paste Username"
- Improve the shortcut logic (e.g. `cmd - u` for copy the username instead of `cmd - b`)
- Use more explicit action names (e.g. "Paste Password" instead of "Paste")
- Update the README.md

## [Enhancement] - 2022-09-27

- Add the ability to hide passwords and TOTPs from clipboard managers

## [Enhancement] - 2022-07-27

- Add support for Key File protected Database file
- Bump api version to 1.38.1
