# Apple Reminders Changelog

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
