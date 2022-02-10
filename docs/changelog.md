# Changelog

## 1.28.0 - 2022-02-09

### 💎 Improvements

* Completely **revised (backwards-compatible) API** – new namespaces, better organisation, more consistency, updated templates, revamped docs. Check out the full [migration guide](https://developers.raycast.com/migration/v1.28.0) and get rid of those deprecation warnings. (At the same time, don’t worry, your extension is going to work as before, even if you don’t take immediate action.)
* We’ve **prettified the CLI output** 💅: all output is now more colourful, cleaner and easier to parse. Update the npm package to v1.28.0 to get the latest CLI for development.
* **Fallback images**: You can now specify local asset files or built-in icons that are displayed when image loading fails, for example when a remote file is missing (![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)[Issue #108](https://github.com/raycast/extensions/issues/108)); [see the docs](https://developers.raycast.com/api-reference/user-interface/icons-and-images)
* **Toasts** are now passed as argument to their action callback, so you can directly act on them in the handler function (for example, hiding them)
* **Extensions feedback:** We’ve added **better bug report and feature request actions** both to the store details page of an extension and to the error screen; the actions prefill some data already in the templates so that reporting issues and feature requests becomes easier for end users.

### 🐞 Bugfixes

* Fixed tag picker images and emojis not being properly displayed (​​![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)[Issue #493](https://github.com/raycast/extensions/issues/493))

## 1.27.1 - 2022-01-28

### 💎 Improvements

* **Preferences:** Added a new app picker preference type – useful if you want to let users customize their apps to use for opening files, folders and URLs [![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #98](https://github.com/raycast/extensions/issues/98)
* **Forms:** Added new `Form.PasswordField` that allows you to show secure text fields ([Issue #319](https://github.com/raycast/extensions/issues/319) and [![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #44](https://github.com/raycast/extensions/issues/44))
* **Forms:** Added new `Form.Description` component that allows you to show a simple label
* Added a new top-level `open` method that gives you more flexibility for opening files, folders, and URLs with default apps or specified apps, often making using an external npm package unnecessary (the built-in open action use our method under the hood)
* **Node:** added security enhancements for the managed Node runtime such as verification of the executable, configuring executable permissions, and removing unnecessary files
* **CLI:** Added more error info output to build errors
* **CLI:** Added a new `—fix` flag to the `lint` command (applies ESLint and prettier fixes)
* **Create Extension Command:** Updated the templates to include a `fix-lint` script; added prettier to devDependencies

### 🐞 Bugfixes

* **Forms:** Fixed `onChange` callback behaviour to be consistent across all components
* **Forms:** Fixed generic updates of titles for all components ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #687](https://github.com/raycast/extensions/issues/687))
* **Preferences:** Fixed a bug in dropdown preferences returning the defined default value, even if the default is not part of the list values
* **Preferences:** Fixed the `data` property not being treated as required for the dropdown
* **Preferences:** Fixed defined initial values not being ignored (use default only)
* **List:** Fixed same-rank items with identical names being non-deterministically ordered
* Fixed a bug with open actions causing double opening via the default and specified app
* **CLI:** Removed auto-installation of npm dependencies through the downloaded npm

## 1.27.0 - 2022-01-12

### 💎 Improvements

* **Developer Tools:** Added `Open Support Directory` action to local dev extensions
* **Developer Tools**: Removed auto-injecting of globals for enabling React Developer Tools in dev mode
* **Developer Tools**: Added `prettier` checks to CLI `lint` command
* **Documentation:** Updates and fixes

### 🐞 Bugfixes

* **Forms:** Fixed controlled updates for the `Form.TagPicker`
* **Navigation**: Fixed a bug where a programmatic pop, followed by a manual pop (e.g. ESC) could lead to wrong state (![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)[Issue #571](https://github.com/raycast/extensions/issues/571))

## 1.26.3 - 2021-12-16

### ✨ New

* New API for **Alert** views: Alerts are useful for destructive actions or actions that require user confirmation; new methods let you display our beautiful native Alert component\
  ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #48](https://github.com/raycast/extensions/issues/48))
* New API for **interactive Toasts**: you can now add buttons to Toasts, e.g. to give the user options for created items, to open the browser, or for any other relevant context ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #438](https://github.com/raycast/extensions/issues/438))
* New API for retrieving the current **Finder selection**: unlocks a couple of use cases for extensions that perform actions on selected files and folders ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #153](https://github.com/raycast/extensions/issues/153))

### 💎 Improvements

* Improved ranking for fuzzy search in lists with sections and keywords
* The icon of the `OpenWithAction` can now be customised
* The env var NODE\_EXTRA\_CA\_CERTS is now being propagated so that custom certificates can be configured
* Improved the CLI error message when an entry point file from the manifest is missing ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #495](https://github.com/raycast/extensions/issues/495))

### 🐞 Bugfixes

* Textfields do not auto-transform certain characters such as dashes any more ([![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #491](https://github.com/raycast/extensions/issues/491) and [![](https://www.notion.so/image/https%3A%2F%2Fwww.notion.so%2Fimages%2Fexternal\_integrations%2Fgithub-icon.png?width=12\&userId=\&cache=v2)Issue #360](https://github.com/raycast/extensions/issues/360))

### ⚙️ Build Updates

* This CLI of this version contains an update of the build tool with changed (and "more compatible") heuristics around how `default` exports are handled. This means that you should double check whether `import` statements for certain npm packages need to be adjusted.\
  **Example**: `import caniuse from "caniuse-api"` has to be changed to `import * as caniuse from "caniuse-api"` because of the missing `default` export of the built `caniuse` library that has to run in a Node environment.

## 1.25.7 - 2021-11-26

### 💎 Improvements

* Keywords added to list items are now matched again by prefixes (exact matches were required previously)
* Extensions are now checked for version compatibility before updating and installation
* New and updated templates available in the "Create Extension" scaffolding command

### 🐞 Bugfixes

* Modifications to list item keywords could result in wrong list filtering
* Fixed a regression where the CLI would not automatically install dependencies when building the extension
* DatePicker form element now returns the time component when specified
* Animated toasts are now automatically dismissed when the extension is unloaded
* Forms don't accidentally trigger draft creation mode any more
* Extensions which are off by default are now correctly disabled

## 1.25.5 - 2021-11-18

### 💎 Improvements

* Full fuzzy search by default for lists using built-in filtering
* Faster list loading times
* Better default auto-layout of list item title, subtitle and accessories
* Extension support directory does not need to be explicitly created any more
* Raycast is no longer automatically brought to the foreground for failure toasts
* New default action to open a bug report on production error screens in extensions

### 🐞 Bugfixes

* Updated extension icons are now displayed without having to re-install the dev extension
* Focus is now kept on the current form element when re-rendering
* Caret does not jump to the end of the string in controlled textfields and textareas any more (one edge left that is going to be tackled in one of the next releases)
* "Disable pop to root search" developer preference is now only applied for commands that are under active development
* Documentation fixes and updates

## 1.25.4 - 2021-11-11

### 💎 Improvements

* Updating of items and submenus while the action panel is open
* Supporting all convenience actions with primary shortcut (cmd + enter) on form views
* Better error handling when the API cannot be loaded after failed app updates

### 🐞 Bugfixes

* Loading indicator in detail views when used in a navigation stack

## 1.25.2 - 2021-10-28

### 💎 Improvements

* Improved ActionPanel updating performance

### 🐞 Bugfixes

* `searchBarPlaceholder` updates when using the list in a navigation stack
* Wrong action panel actions when popping back in a navigation stack
* Empty state flickering when updating the `isLoading` property in lists
* Accessory and subtitle label truncation in lists
* Icon from assets tinting on dynamic theme changes
* Dynamic removal of form elements
* Open actions leading to Node env vars being set for the opened application
* Some extensions not getting loaded for a particular Node setup
* Local storage values being lost when extensions are automatically updated

## 1.25.1 - 2021-10-20

### 🐞 Bugfixes

* Fixed configuring `tintColor` for icons in `ActionPanel` and `Form.Dropdown`
* Fixed displaying submenu icons from local assets
* Fixed tinting of icons provided from local assets
* Fixed a crash with the `getSelectedText` function
* Fixed the main window sometimes not shown when an error is thrown from a command
* Fixed the `OpenWithAction` not working for some apps
* Fixed the list empty state not being shown in certain cases when using custom filtering
* Fixed the the topmost item not automatically being selected for custom list filtering
* Fixed the line number info in error stack traces sometimes not being correct
* Fixed an issue where installing store extension would sometimes fail
* Fixed a crash that could be caused by sending invalid codepoints from an extension
* Fixed a bug where no error would be shown when the runtime download failed
* Fixed reaching the max. call stack size when logging recursive object structures (this could happen when you console logged a React component, for example).

## 1.25.0 - 2021-10-13

### Hello World

It's happening! We're opening up our API and store for public beta.

![](.gitbook/assets/changelog-hello-world.png)

This is a big milestone for our community. We couldn't have pulled it off without our alpha testers. A massive shoutout to everybody who helped us shape the API. Now let's start building. We can't wait to see what you will come up with.
