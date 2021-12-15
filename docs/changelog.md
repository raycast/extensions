# Changelog

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
