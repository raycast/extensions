# Notion Changelog

## [Add Text to Page command] - 2024-04-11

- Add command to append or prepend text to a page.

## [Change Properties order in Create Database Page] - 2024-03-22

- Add ability to change order of properties when creating a new database page
- Fix showing/hiding properties when creating a new database page

## [Improve authentication docs] - 2024-02-27

- Improve documentation on creating an internal integration
- Use OAuth utils

## [Properly allow date with time] - 2024-02-15

- Fix a bug that prevented creating pages with time

## [Open Notion page improvement] - 2024-01-02

- Add the ability to open Notion in the browser of your choice or in the Notion app.

## [Add alternate open action] - 2023-12-03

- Add an action that alternates with the primary open action. For example, if the primary action is set to open in Notion, the alternate action will open in the browser, and vice versa.

## [Fixes] - 2023-10-12

- Fix duplicated recent and searched pages sometimes showing
- Modify how recent pages are stored
- Fix last edited time showing as the current time
- Fix duped recent pages after page title changed
- Allow selecting just a date without a time
- Support quick edit status property
- Fix not being able to create a page with an empty select property

## [Deep links] - 2023-09-29

- New action to `Create Database Page` that copies a [deeplink](https://manual.raycast.com/deeplink) to open the command as configured.

## [Small enhancements] - 2023-09-22

- Add support for selecting options from Status properties

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
