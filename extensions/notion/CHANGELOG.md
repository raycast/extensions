# Notion Changelog

## [Fix bugs and add colors] - 2023-09-06

- Fix status property support in database list view, database kanban view, and create page view
- Fix action panel calling "Databases" as "Pages"
- Fix deleting databases
- Use notion-provided colors


## [Small fixes] - 2023-08-16

- Hide formula fields when creating database pages
- Fixes can't read property `plain_text` error
- Update screenshots

## [Big update] - 2023-07-25

This update introduces a new `Quick Capture` command. This lets you quickly save websites in Notion by using their URL or copying it onto your clipboard, then launching the command. You can choose to just save the URL, the entire webpage, or an AI-generated summary.

The page preview now includes a secondary action allowing you to see a metadata panel with page properties. Many properties are supported, including title, emails, numbers, checkboxes, statuses, and more! Speaking of properties, page properties in the list view now make use of Raycast components, improving their visual appearance. Tooltips have also been added to make it easier to identify the property you are viewing. Additionally, when searching Notion pages, you can now see the last author who edited the page.

Page list items have also gained some actions to enhance the extension's power. Now you can:
- Create quick links to your favorite pages
- Delete pages
- Copy a page's formatted URL (useful in chat apps such as Slack)
- Copy a page's title

This update modifies a key default setting. Initially, the main action for Notion pages was to preview them in Raycast. Now, the default is to open them in Notion. If you'd like to revert back to previewing pages in Raycast, you can do so via the ﻿Search Pages preference.

The extension has also been revamped under the hood to improve maintainability and ensure it stays up-to-date with the Raycast ecosystem.

## [Markdown parsing] - 2022-07-08

- Improve markdown parsing when create a page
- Add a dropdown to sort by "last edited at" or "last created at" when searching in a database

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
