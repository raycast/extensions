# GitHub Changelog

## [Use buil-in icons for My Pull Requests Menu Bar] - 2024-02-25

- Use Raycast's built-in icons for the My Pull Requests Menu Bar.

## [Fix repository name after change] - 2024-02-21

- Fixes an issue where a visited repository does not reflect the correct name after being changed on GitHub.

## [Use OAuth utils] - 2024-02-15

- Use new OAuth utils.

## [Select categories for My Pull Requests Menu command] - 2024-02-14

- Add preferences to include or not some categories of Pull Requests in the My Pull Requests menu bar command.
- Add preferences to include or not some categories in the count of the My Pull Requests menu bar command.

## [Change cancelled workflow run status icon color] - 2024-02-12

- Change cancelled workflow run status icon color to be in line with GitHub's UI.

## [Open vercel preview on pull requests] - 2023-12-18

- If you have a vercel project, you can now open your preview directly from your pull request.

## [Mark notification as read without opening it] - 2023-11-16

- You can now mark notification as read in the menu bar without opening the notification by pressing `⌥` and clicking the notification.

## [Search Repositories improvements + Fixes] - 2023-11-06

- Add "Archived" and "Fork" tag accessories in the "Search Repositories" results.
- Hide archived repositories in the different create commands.
- Sort repositories by last updated.
- Fix the updated date to use the latest commit push.
- Fix Open Pull Request menu bar command following GitHub's outage.

## [Add My Latest Repositories command] - 2023-11-06

- Add a command to show my latest repositories in descending order.

## [Add Clone and Open command] - 2023-10-11

- Add a command to clone (unless already cloned) and open in the preferred code editor a repository from the seacrh repository results.

## [Fix menu colors] - 2023-09-30

- Fix menu colors for issues and pr menus.

## [Fix menu bar notifications] - 2023-09-06

- Fixes an issue where marking all notifications as read wouldn't reset the menu bar notifications count.

## [Pull request templates] - 2023-08-08

- Support all pull request templates when creating pull requests.

## [Bug fix] - 2023-08-07

- Fixed a bug (`Cannot read properties of null (reading 'name')`) which caused the extension to crash.

## [Added missing value] - 2023-08-04

- Fix missing repo name for non numberTag cases.

## [Menu Commands] - 2023-07-18

- Add repo name to `Unread Notifications` Menu.

## [Menu Commands] - 2023-07-10

- Add Issues Menu Command.
- Add Pull Requests Menu Command.

## [Support rerun failed workflow jobs] - 2023-06-27

- Support rerun failed workflow jobs in `Workflow Runs` command.

## [Show Issue/PR number in Notification] - 2023-06-19

- Add Issue/PR number in `Notification` command.

## [Add more branches to the into field] - 2023-06-16

- Add more branches to the into field in Create Pull Request command (#4642).

## [Menu bar mark all as read] - 2023-05-20

- Add `Mark All as Read` command to menu bar action.
- Fix `graphql` not being part of devDependencies.

## [Notifications fixes] - 2023-04-05

- Add `issuecomment` prefix to read notifications.
- Don't show success toast when opening a notification.

## [Clear form fields] - 2023-01-19

- Clear form fields when creating an issue.
- Clear form fields when creating a pull request.

## [Add linked branch actions] - 2023-01-11

- Add `Create Branch` command.
- Add create, delete branch actions directly from an issue action panel.

## [Add text colors and tags] - 2022-12-16

- Add colors to review decisions and remove icons to avoid confusion with CI checks.
- Change primary language and workflow's head branches from texts to tags.

## [Issue and Pull Requests from repos] - 2022-11-21

- Add actions to show pull requests and issues directly from a repository.
- Add `My Discussions` command.
- Add actions to show discussions of a repository.
- Use svg icon in `Unread Notification menu bar` command to be big enough on all screen sizes.
- Use `UserInitiated` instead of `Background` when marking a notification as readed, otherwise the menubar item don't refresh itself and stay out of sync until the next time tick occur.

## [Search Repositories improvements]

- Hide repositories in "Found Repositories" if they are in "Visited Repositories".
- Fix notification's icon color for the "Unread Notifications" command.

## [Added Extension to Store] - 2021-11-30

GitHub added to the Raycast Store.
