# Apple Reminders Changelog

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
