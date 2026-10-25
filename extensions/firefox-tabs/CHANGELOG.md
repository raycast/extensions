# Firefox Tabs Changelog

## [Fix Setup After Raycast Updates] - {PR_MERGE_DATE}

- Fix installing or updating the native host failing with "file already exists" after Raycast moved its bundled Node.js
- Repair the link to Raycast's Node.js whenever Search Firefox Tabs or Set Up Firefox Bridge opens, and finish an update that was interrupted

## [Automatic Native Host Updates] - {PR_MERGE_DATE}

- Install a pinned native host release and check it against hashes shipped with the extension
- Update an older native host automatically when Search Firefox Tabs or Set Up Firefox Bridge opens, then reconnect each Firefox profile to it

## [Profile Setup] - {PR_MERGE_DATE}

- Search Firefox Tabs lists running profiles that are missing the companion extension, with an action to install it in that profile
- Offer to install the companion extension, instead of native host setup, when Firefox is running without it
- Open pages in a profile with the Firefox it runs from, so Developer Edition, Nightly and Firefox outside /Applications work
- Set Up Firefox Bridge (renamed from Setup Firefox Bridge) shows the native host and every Firefox profile with what each one still needs, and only downloads the native host when it isn't installed

## [Multiple Firefox Profiles] - {PR_MERGE_DATE}

- Show tabs from every running Firefox profile, not just one
- Switch to and close tabs in the profile they belong to
- Leave out a profile that stops responding instead of waiting for it
- Keep the list up to date while Search Firefox Tabs stays open, so tabs opened, closed or navigated in Firefox show up
- Show each profile's avatar and color on its window tags, and filter tabs by profile from the search bar

## [Fix Typing Lag With Many Tabs] - 2026-10-24

- Cache favicons as files so searching stays responsive with hundreds of open tabs

## [Added Setup Command and Native Host Bundling] - 2026-04-22

- One-command setup: run "Setup Firefox Bridge" to install everything automatically
- Native host bundled as single file with automatic download from GitHub Releases
- SHA256 verification of downloaded bundles
- 5-level Node.js discovery chain for reliable script execution

## [Initial Release] - 2026-04-22

- Search and switch open Firefox tabs by title or URL
- Close tabs from the action panel
- Container tab indicators with color coding
- Multi-window support with window number badges
- Pinned and active tab indicators
- Favicon display with letter-avatar fallbacks
