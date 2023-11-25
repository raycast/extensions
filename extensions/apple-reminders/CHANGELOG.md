# Apple Reminders Changelog

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

## [Recurring remidners and better group by dates] - 2023-10-24

- Add support for basic recurring reminders in `Create Reminder` and `Quick Add Reminder`
- Improve "Group by due dates" behavior. Now, dates are grouped based on their actual due dates, regardless of whether they are due tomorrow, in 3 months, or in a year.

## [Initial Version] - 2023-10-19