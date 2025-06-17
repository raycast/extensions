# Anytype Changelog

## [UI Polish, Tag Management & Fixes] - 2025-05-26

- Add context actions to manage tags on objects (add/remove)
- Improve type indicators across all object lists
- Support built-in SVG icons for type creation and editing
- Standardize placeholder text and information messages
- Update to API version 2025-05-20

## [Properties, Types & Tags] - 2025-05-07

#### New Creation Options

When browsing spaces, press `CMD+N` to create new objects, types, properties or tags.

- Add ability to create new spaces
- Add ability to create new types
- Add ability to create new properties
- Add ability to create new tags

#### Edit Form Enhancements

Use `CMD+E` to quickly edit the currently selected item - whether it's a space, object, type, property, or tag.

- Add support for editing spaces
- Add support for editing objects
- Add support for editing types
- Add support for editing properties
- Add support for editing tags

#### New Commands & Navigation

- Add new command to add objects to lists
- Pop back to list view when deleting object, with automatic refresh
- List properties when browsing space
- Browse tags for select/multi-select properties
- Open bookmarks directly in browser

#### Form Improvements

- Allow custom properties (inherited from type) for object creation
- Improve number and emoji validation logic in create form

## [✨ AI Enhancements & Improvements] - 2025-04-22

#### AI Extension

- Interact naturally with your Anytype spaces using `@anytype` to create object content with the power of AI
- Use simple natural-language queries to search globally or within specific spaces
- Manage objects and lists (collections) easily with commands like adding to or removing objects from lists

#### Pinning

- Pin objects to top of global search for quicker access
- Pin spaces and specific objects/types/members per space

#### Object Creation & Templates

- Create objects directly within collections
- Use predefined templates when creating new objects
- Quickly create spaces and objects with pre-selected context (space, collection, or type) directly from empty search results

#### Object Details

- Show all properties (including custom ones) of an object in the detail sidebar
- Toggle the sidebar visibility using action or keyboard shortcut
- Make object references clickable in the sidebar (e.g. type of the object, linked project etc.)

#### Browsing

- Browse items within lists (collections and sets) with support for multiple views
- Display objects of a specific type beneath their corresponding templates when viewing types within a space
- Show space names in navigation titles when browsing spaces or lists

#### Preferences

- New preference setting to open objects directly in Anytype app instead of displaying them in Raycast’s detail view
- Add setting to make URLs & Mailto links clickable in sidebar

#### Bug Fixes & Performance Improvements

- Fix fetching limitation of max 100 types in dropdown during object creation
- Correctly handle UNIX epoch date timestamps for members

## [Fixes] - 2025-01-28

- Fix bugs for search, navigation and deeplinks
- Add sort and fetch options to preferences
- Improve authentication flow

## [Initial Version] - 2025-01-21

Anytype added to the Raycast Store.
