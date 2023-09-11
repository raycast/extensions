# GitHub Changelog

## [Fix menu bar notifications] - 2023-09-06

- Fixes an issue where marking all notifications as read wouldn't reset the menu bar notifications count.

## [Pull request templates] - 2023-08-08

- Support all pull request templates when creating pull requests.

## [Bug fix] - 2023-08-07

- Fixed a bug (`Cannot read properties of null (reading 'name')`) which caused the extension to crash.

## [Added missing value] - 2023-08-04

- Fix missing repo name for non numberTag cases 

## [Menu Commands] - 2023-07-18

- Add repo name to `Unread Notifications` Menu

## [Menu Commands] - 2023-07-10

- Add Issues Menu Command
- Add Pull Requests Menu Command

## [Support rerun failed workflow jobs] - 2023-06-27

- Support rerun failed workflow jobs in `Workflow Runs` command

## [Show Issue/PR number in Notification] - 2023-06-19

- Add Issue/PR number in `Notification` command

## [Add more branches to the into field] - 2023-06-16

- Add more branches to the into field in Create Pull Request command (#4642)

## [Menu bar mark all as read] - 2023-05-20

- Add `Mark All as Read` command to menu bar action
- Fix `graphql` not being part of devDependencies

## [Notifications fixes] - 2023-04-05

- Add `issuecomment` prefix to read notifications
- Don't show success toast when opening a notification

## [Clear form fields] - 2023-01-19

- Clear form fields when creating an issue
- Clear form fields when creating a pull request

## [Add linked branch actions] - 2023-01-11

- Add `Create Branch` command
- Add create, delete branch actions directly from an issue action panel

## [Add text colors and tags] - 2022-12-16

- Add colors to review decisions and remove icons to avoid confusion with CI checks
- Change primary language and workflow's head branches from texts to tags

## [Issue and Pull Requests from repos] - 2022-11-21

- Add actions to show pull requests and issues directly from a repository
- Add `My Discussions` command
- Add actions to show discussions of a repository
- Use svg icon in `Unread Notification menu bar` command to be big enough on all screen sizes
- Use `UserInitiated` instead of `Background` when marking a notification as readed, otherwise the menubar item don't refresh itself and stay out of sync until the next time tick occur

## [Search Repositories improvements]

- Hide repositories in "Found Repositories" if they are in "Visited Repositories"
- Fix notification's icon color for the "Unread Notifications" command

## [Added Extension to Store] - 2021-11-30

GitHub added to the Raycast Store.
