# Simple Reminder Changelog

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
