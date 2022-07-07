# Notion Changelog

## [Bugfixes] - 2022-07-05

- Fixed `Create Database Page` to use client [timezone](https://developers.notion.com/changelog/time-zone-support) when supplying a date field.
- Fixed `Create Database Page` to pop navigation when using `Create and Open Page`.
- Clean up some type definitions.

## [OAuth] - 2022-05-10

- You can now logged in using OAuth instead of having to create your own integration
- Added an Action to append some content to an existing page
- The Search command now returns Databases as well. From there, you can navigate to a Database to list all its pages, search in it, have create custom views for each of them.

## [Improvement to the Create Database Page Command] - 2022-04-29

- Added an Action to open the Notion Page after creating it
- Added a TextArea to add some content to the page directly
