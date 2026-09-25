# Apple Reminders Changelog

## [Natural Language Recurrence in Create Reminder] - 2026-09-25

- Support natural language recurrence patterns (e.g. `every day`, `every Friday 10am`, `every 2 weeks`, `weekdays`, `monthly`) in the Create Reminder free-text date field.
- Automatically populate recurrence frequency, interval, and start date from text input.

## [Create Reminder from Selected Email] - 2026-09-25

- Add "Create Reminder from Selected Email" command to create reminders directly from the active email in Apple Mail.
- Attach native `message://` URL link to created reminders for 1-click opening of the email thread in Apple Mail.
- Support interactive form mode with pre-filled title and email URL as well as instant background reminder creation.
- Add "Default Due Date & Time" and "Default List" preferences for email reminders.

## [Weekly Review and Action Capture Skill] - 2026-09-24

- Update to Raycast API 2.5.0 for public bundled-skill support.
- Review completed and outstanding reminders and capture supplied action items without inventing deadlines.

## [Date Format Preference] - 2026-09-24

- Add extension-level "Date Format" preference (`Month / Day (MM/DD)` and `Day / Month (DD/MM)`).
- Interpret ambiguous numeric dates (such as `1/11`) according to the selected format across Quick Add and Create Reminder date parsing.

## [Move reminder to list action] - 2026-09-24

- Add "Move to List" action submenu (`Cmd + Shift + M`) to easily move reminders between lists in My Reminders.
- Support moving reminders to a different list via AI update tool.

## [Default list for Quick Add] - 2026-09-23

- Add "Default List" preference to the "Quick Add Reminder" command to automatically assign reminders to a specified list when no list is mentioned.

## [Create Reminder from Current Tab] - 2026-09-23

- Add "Create Reminder from Current Tab" command to create reminders directly from the active browser tab.
- Attach native URL link to created reminders for 1-click opening in Apple Reminders.
- Support interactive form mode with pre-filled title and URL as well as instant background reminder creation.
- Add "Default Due Date & Time" preference to schedule reminders with natural language (e.g. `6pm`, `in 2 hours`, `tonight`, `tomorrow 9am`).

## [Updated maintainer metadata] - 2026-09-23

- Marked a former Apple Reminders maintainer as a past contributor.

## [Display tags in My Reminders] - 2026-09-23

- Display attached tags as accessories in the "My Reminders" list view.
- Support filtering reminders by tag names in "My Reminders".

## [Add priority and tags support] - 2026-09-23

- Add support for setting priority (`low`, `medium`, `high`) and tags when creating or updating reminders.
- Add priority dropdown and tags field to Create Reminder and Edit Reminder forms.
- Support priority and tags in AI tools and Quick Add natural language parser.

## [Display due time in menu bar] - 2026-09-07

- Display scheduled due time before reminder titles in menu bar items.
- Add "Display Exact Due Time" preference to My Reminders to show exact due time in list accessories.

## [Fix Menu Bar Reminders title truncation] - 2026-08-27

- Truncate menu bar reminder titles by Unicode character instead of UTF-16 code units so emoji and other multi-byte characters are not split.

## [Fix natural-language due dates] - 2026-08-19

- Restore relative due-date parsing in Create Reminder for `1h`, `1 hour`, `3 hours`, `in 10 minutes`, `3:45 pm`, `3 days`, and `1 year`.
- Treat the `h` shortcut as hours instead of months.
- Harden Quick Add Reminder: parse fenced AI JSON, drop invalid list IDs, fill missing dates from natural language, and fall back to local parsing when AI fails.
- Clear stale natural-language due dates after a failed parse or a successful create.
- Apply Quick Add timezone conversion only to AI-provided datetimes, and keep location fields when creating from Quick Add.

## [Tighten AI reminder defaults] - 2026-06-16

- Prevent AI tool calls from defaulting title-only reminders to dated, prioritized, or recurring reminders.
- Add AI eval coverage for title-only Backlog/default-list reminder creation.

## [Fix Create Reminder close shortcut] - 2026-05-19

- Restored the Shift+Command+Enter shortcut for creating a reminder and closing the window.

## [Customize Create Reminder Form and Manage Create Actions] - 2026-04-22

- Add a new "Customize Create Reminder Form" command to control which field groups appear in the Create Reminder form.
- Allow field groups to be turned on or off and moved up or down into a preferred order.
- Add support for separators in the customizable layout so sections can be added, moved, and removed.
- Add a "Customize Create Reminder Form" action directly inside the Create Reminder form.
- Add a new "Manage Create Actions" command to configure Apple Shortcuts that run after reminders are created.
- Allow shortcuts to be searched from the local `shortcuts` CLI and added as post-create actions.
- Add support for enabling, disabling, reordering, renaming, and removing configured create actions.
- Add per-action scope so shortcuts can run for "Create Reminder", "Quick Add Reminder", or both.
- Add a "Manage Create Actions" action directly inside the Create Reminder form.
- Run configured shortcuts after reminder creation without passing any input.
- Preserve location-based alarms when updating a reminder due date.

## [Fix Quick Add Reminder scheduling for past time-only input] - 2026-03-15

- In `Quick Add Reminder` (non-AI mode), when a time is provided without an explicit date and that time has already passed, schedule the reminder for the next day instead of earlier today.
- Resolves: https://github.com/raycast/extensions/issues/26334

## [Prevent accidental recurring reminders from AI] - 2026-02-26

- Add tool confirmations for recurring reminder creation and recurrence updates so users can approve recurrence changes.
- Tighten AI instructions to explicitly avoid recurrence unless the user asks for it.
- Add an AI eval for one-off reminder prompts to prevent recurrence regressions.
- Resolves: https://github.com/raycast/extensions/issues/25489

## [Fix Quick Add Reminder AI model selection] - 2026-02-10

- Fix Quick Add Reminder to use user's selected AI model instead of hardcoded OpenAI GPT-4o
- Fix date formatting bug in non-AI path when displaying success messages
- Resolves: https://github.com/raycast/extensions/issues/23932

## [Improve search results ordering] - 2026-02-06

- Keep incomplete reminders above completed ones when filtering in My Reminders

## [Fix crashes when reminder data is undefined] - 2026-01-28

- Fix crash in menu bar when `data.reminders` is undefined or not an array
- Add defensive checks in `getAttachedUrls` to handle undefined `attachedUrls` property
- Resolves: https://github.com/raycast/extensions/issues/24450
- Resolves: https://github.com/raycast/extensions/issues/24454

## [Fix crash when attachedUrls is undefined] - 2026-01-13

- Handle reminders where `attachedUrls` may be undefined to prevent runtime errors

## [Open all attached reminder URLs] - 2026-01-13

- Detect all URLs in reminder notes (and Reminder URL when available) and expose an “Open Attached URL(s)” action in the list and menu bar.

## [Simplify AI schema for locations] - 2026-01-09

- Constrain location icons to a small string enum and map back to Raycast icons to reduce AI tool schema branching (Gemini 2.5 fix)
- Tighten proximity/icon enums for the location tool while keeping legacy values falling back to default icons
- Resolves: [apple-reminders] Apple Reminders Extension Fails with Gemini 2.5 Pro #20635

## [Fix Day Grouping option displays duplicate days] - 2025-11-30

- Fix an issue where enabling `Use Time of Day Grouping` would cause duplicate day sections to appear in the `My Reminders` view (Today and Scheduled)

## [Add ability to move reminders between lists] - 2025-10-17

- Add list selection dropdown in the Edit Reminder form
- Implement `moveToList` function to change reminder's list
- Allow users to move reminders to different lists when editing
- Added logic to only update title/notes and list if they have changed

## [Add Creation Date option for sorting] - 2025-06-13

- Retrieve the Creation Date from the EventKit API
- Add an option to sort reminders by Creation Date, as this is available in the native app

## [✨ Add option to show list name in menu bar reminders] - 2025-06-04

- Add an option that allows users to choose whether to display the list name next to each reminder’s name in the menu bar.

## [✨ AI Enhancements] - 2025-02-21

## [Add new "Upcoming" grouping option] - 2025-02-10

- Add a new mode which allows group reminders by when they are upcoming in the `My Reminders` view.

## [Add "Overdue" view and default date setting] - 2025-02-10

- A new "Overdue" view has been added, displaying only reminders that are overdue.
- There's now an option to automatically set the default date of new reminders to the current day.

## [Add weekdays and weekends options for recurring reminders] - 2024-12-04

- Add weekdays and weekends options for recurring reminders in the `Create Reminder` command.

## [Group today's reminders by time of day] - 2024-10-28

- Group today's reminders by time of day (morning, afternoon, tonight) just like in the native Reminders app.

## [Sort menu bar reminders by due date] - 2024-10-01

- Sort menu bar reminders by due date instead of the order they were created.

## [Add pre-fill for the Create Reminder command with text from My Reminders search] - 2024-09-18

The Create Reminder command will automatically pre-fill the title with the initial query when there are no search results in My Reminders.

## [Change AI model for Quick Add Reminder] - 2024-05-23

Now, Quick Add Reminder will use GPT-4o instead of GPT-4 Turbo.

## [Add Saved Locations] - 2024-04-16

- Save your frequently used locations with the new "Add Saved Location" action when creating a reminder. This makes it easy to quickly add new location-based reminders later.
- In "Quick Add Reminder," you can add reminders for locations or any of your saved locations - simply specify the one you want to use.

## [Separate menu bar count from the view] - 2024-04-15

- It's now possible to set reminders count type separately from the view type in menu bar.

## [Quick Add Reminder Improvements] - 2024-04-11

- It's now possible to specify a due date and a list (with an `#` prefix) in `Quick Add Reminder` when not using the AI.
- Fixed a bug where notes wouldn't be saved when adding a reminder without using the AI in `Quick Add Reminder`

## [Fix interval error validation] - 2024-03-20

- `interval` error validation now checks for `0` and `negative` values.

## [Quick Add Reminder Fix] - 2024-03-12

- Fixed an issue where reminder notes were not being saved properly when using the Quick Add feature.

## [Performance improvements & bug fixes] - 2024-03-01

- Completed reminders are now loaded on demand and not upfront, which should fix heap memory errors
- Add a limit of 1000 reminders so that the extension doesn't break with heap memory errors

## [Add a preference to not use AI for Quick Add Reminder] - 2024-02-23

- You can now disable the AI in `Quick Add Reminder` if you want to quickly add raw reminders to your default list.

## [Fix SwiftError] - 2024-02-14

- Fix an issue where recurring reminders in December would make it impossible to retrieve any data in `My Reminders`.

## [Use GPT-4 model for Quick Add Reminder command] - 2024-02-12

- Improve `Quick Add Reminder` results by using GPT-4 instead of the default model (GPT-3.5 Turbo)

## [Fix Invalid time value error] - 2024-01-31

- Fix an error that occurs in "My Reminders" when a reminder does not have any due dates, but the list is grouped by due dates.

## [Fix timezone bugs] - 2024-01-26

- Fix multiple timezone issues that result in reminders not being displayed in the correct section or with incorrect dates.

## [Bug fixes] - 2024-01-26

- Fix a bug where it wasn't possible to remove the priority from a list item
- Fix a bug where it wasn't possible to remove the due date from a list item
- Fix a bug where it wasn't possible to change the due date from the menu bar
- Migrate codebase to use new Swift macros

## [Allow to open Reminders app from the menu bar] - 2024-01-25

- Add menu item that allows to open the Reminders app from the menu bar.

## [Fixes pop to root issue after creating reminders] - 2024-01-16

- Fix an issue where `Create Reminder and Close Window` would stay on the `Create Reminder` screen after opening up Raycast again. Now, it should immediately pops to root after closing the window.

## [Add location-based reminders] - 2024-01-12

- Add support for location-based reminders. You can now see which reminders have locations and easily create new ones with locations.

## [Improvements and bug fixes] - 2024-01-11

- Add an option to display the title of the first reminder next to the menu bar icon.
- Fix a bug where an overdue reminder wouldn't be updated in the native app when changing the due date from Raycast.
- Fix a bug where setting a due date from Raycast wouldn't add any notifications to it.

## [Improve NLP in Quick Add Reminder] - 2023-12-08

- Improve NLP parsing in the `Quick Add Reminder` command by adding an endDate for recurring reminders.

## [Add option to hide menu bar count when empty] - 2023-12-20

- Allow hiding the menu bar count when there are zero reminders.

## [Fix Create Reminder command] - 2023-12-18

- Fix a bug where the priority value wouldn't be saved
- Remove the minimum date constraint for the due date

## [Improve NLP in Quick Add Reminder] - 2023-12-04

- Improve the NLP parsing in `Quick Add Reminder`.

## [Date display bug] - 2023-12-01

- Fix a bug that displays full-day dates with time in the tooltips of reminder items.

## [Minor improvements] - 2023-11-25

- Add list filtering to the menu bar

## [Add support for drafts] - 2023-11-24

- Add support for drafts in `Create Reminder` command
- Fix a bug that prevents selecting today's date without setting a time.

## [Minor improvements] - 2023-11-16

- Press `⌥` to delete a reminder without any confirmation in the menu bar.
- Add a preference to always initially select the default list in the `Create Reminder` command

## [Bug fixes] - 2023-11-13

- Add notifications to reminders when they're set for a specific time
- Don't reset the due date, priority, and list fields when creating a new reminder

## [Today and Scheduled views] - 2023-11-03

- Add support for today and scheduled views, similar to those in the native Reminders app.

## [Recurring reminders and better group by dates] - 2023-10-24

- Add support for basic recurring reminders in `Create Reminder` and `Quick Add Reminder`
- Improve "Group by due dates" behavior. Now, dates are grouped based on their actual due dates, regardless of whether they are due tomorrow, in 3 months, or in a year.

## [Initial Version] - 2023-10-19
