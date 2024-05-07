# Simple Reminder Changelog

## [Reminder Menu Bar] - 2024-05-07

- Add a menu bar command to check the reminder list in the macOS menu bar
- The menu bar list is the same as presented in the list command

## [Recurrent reminders] - 2024-05-06

- Add action to set reminders as recurrent (daily, weekly, bi-weekly, monthly)
- Visual improvements and reordering of the reminder actions to be more user-friendly
- Copy reminder and delete reminder actions now have intuitive shortcuts

Notes:
- This feature addition makes some visual changes (2 sections to separate recurrent from normal reminders), but shouldn't cause any breaking change

## [Fix] - 2024-03-18

- Fix issue with topics having quoted words not triggering notifications

## [Fix] - 2023-11-24

- Optimize import to reduce build size

## [Improved input parsing] - 2023-10-30

- Improve the input parsing by the user
- No longer removes certain words from the user input
- No longer removes certain special characters like "?" or "!"

## [Mobile notifications with ntfy] - 2023-05-02

- Add preferences to let the user be notified in their mobile device through ntfy
- Refactor code so that the reminders trigger a mobile notification if defined in the user preferences

## [Copy remind action] - 2023-04-28

- Add "Copy to Clipboard" action for the reminders
- Fix the delete reminder dialog not showing the trash icon
- Refactor code to be more maintainable

## [Initial Version] - 2023-04-20

- Add "Add-reminder" command to set a new reminder in the system by interpreting natural language
- Add a list of the existing reminders
- Add an action to delete existing reminders
- Add a background task to notify the user with a system notification when the reminders date and time is up
