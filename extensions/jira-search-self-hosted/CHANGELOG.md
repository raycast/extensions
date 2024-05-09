# Jira Search Self Hosted Changelog

## [Fixed typo] - 2024-04-30

## [Update] - 2024-02-02

Added new `Open Issues` command that loads only open issues assigned to user owning token added to preferences. 

## [Update] - 2023-09-07

Updated dependencies

## [Update] - 2023-08-16

Added an ability to search projects by title and key case-insensitive

## [Update] - 2022-07-30

Added a new filter based on the assignee of a ticket. This filter can accept either the email address of the user, or the user's full name in quotes.

See all of your open tickets:
!open %john.smith@gmail.com
!open %"john smith"

## [Update] - 2022-06-16

- Updated Raycast API to 1.36.0
- Added the possibility to filter against ticket status (one or more) using "!" (exclamation mark)
