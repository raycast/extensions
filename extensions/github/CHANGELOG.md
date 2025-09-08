# GitHub Changelog

## [Fix clone with options action] - 2025-09-08

- Fix the clone action by adding the quote to the command to prevent issues with spaces in the path

## [Add My Starred Repositories command] - 2025-08-25

- Add new "My Starred Repositories" command to view starred repositories
- Displays starred repositories with support for sorting and visiting history
- Integrated with existing repository list components for consistent experience

## [Issue type specification] - 2025-08-22

- Adds the ability to specify the issue type when creating a new issue.

## [Fix repository filtering] - 2025-06-26

- Correct the repository filtering for exclude mode

## [Add repository filtering] - 2025-06-05

- my-issues, my-pull-requests and menu counterparts can now specify repositories to include / exclude

## [Filter recently closed PRs by last update date] - 2025-04-16

- Fixed a bug where active pull requests could be hidden: the `updated` filter is now only applied to closed PRs, so all active PRs are always shown in `My Pull Requests`.

## [Add support for merge queues and auto-merge] - 2025-04-15

- Adds PR actions for repositories that use merge queues
- Adds the ability to enable auto-merge
- Fix codegen lint hook

## [Add the ability to search for collaborators in the pull request actions] - 2025-03-19

- Add the ability to search for collaborators in the pull request actions, instead of just showing the first 25.

## [Add repository filtering for menu bar commands] - 2025-03-11

- Add the ability to include or exclude specific repositories from the results for the `My Pull Requests` and `Unread Notifications` Menu Bar commands.

## [Chore] - 2025-03-10

- Fix typo in setting label

## [✨ AI Enhancements] - 2025-02-21

## [Fix base clone path] - 2025-01-19

- Move `baseClonePath` to extension root level
- Fix `Clone and Open` path

## [Mark notification as done] - 2025-01-09

- Add a new action to mark a notification as done.

## [Change menu bar unread style] - 2024-12-17

- Use a new icon with indicator for unread state

## [Support specifying Git clone protocol] - 2024-12-12

- Added support to specify the Git clone protocol (SSH or HTTPS) in extension preferences.
- `Copy Clone Command` and `Clone And Open` now respect the clone protocol from the preferences.

## [Update GraphQL generated types] - 2024-12-09

- Updated auto-generated GraphQL codes with the latest schema.

## [Handle notification icon retrieval error] - 2024-11-08

- Unread Notifications Menu Bar: Display a fallback icon when the notification icon retrieval fails.

## [Improved options for My Issues] - 2024-11-04

- My Issues Command + Menu Bar: Add a preference that allows showing or hiding issues opened by the user from searches. On by default.

## [Fix crash when searching visited repositories] - 2024-10-04

The issue causing a crash during the "Search Repositories" feature, when two or more repositories had been visited, has been resolved. This problem originated from changes in [this pull request](https://github.com/raycast/extensions/pull/13684).

## [Fix copy commit tree URL action] - 2024-09-13

- Fix the "Copy Commit Tree URL" action to ensure it correctly copies the commit Tree URL as intended.

## [Clone Repo Fixes] - 2024-08-20

- [#13872](https://github.com/raycast/extensions/issues/13872): Brought back the feature for Raycast to act as a fast brower to open cloned repo.
- Re-added _Clone Path_ preference without any default value this time. If no value is provided, user will need to specify directory with the form.
- If a value for _Clone Path_ preference is specified, the old behavior of cloning the repo (or opening if it exists) is enacted.

## [Fix capitalization] - 2024-08-15

- Ensured title-style capitalization in action titles.

## [My Issues and PRs Improvements] - 2024-08-12

- My Issues Command + Menu Bar: Preferences to specify categories to display. Issues opened by the user will always be displayed.
- My PRs Command + Menu Bar: Preferences to specify categories to display. PRs created by the user will always be displayed.
- The categories not being displayed will not invoke extra API calls, reducing throttling.
- My PRs Menu Bar: Removed `includeCount` options to keep things simple (and in-sync) by just displaying the count of PRs in the categories selected.

## [Improvements] - 2024-08-12

- Updated IDE icons.

## [Enhanced Repository Cloning Functionality] - 2024-08-01

- Users can now select both a custom directory and a specific branch for cloned repositories.

## [Disabled By Default Commands] - 2024-07-31

Make the least-used commands disabled by default to avoid an overwhelming initial experience:

- `Create Branch`
- `Search Discussions`
- `My Discussions`

## [Improvements] - 2024-07-23

- Enhanced the display of repository stars in the `Search Repositories` command by prefixing the number with a star symbol (★).

## [Fix copy commit URL action] - 2024-07-22

- Fix the "Copy Commit URL" action to ensure it correctly copies the commit URL as intended.

## [Repository Improvements] - 2024-07-12

- Adds primary language color and code icon to the accessory for being in-sync with GitHub UI.
- Adds "Sort By" action for My Latest Repositories with supported options.

## [Improvements and Fixes] - 2024-07-08

- Adds an action to sort the PRs, issues, discussions and repos.
- For creating branches with no linked issues, the branch name does not need to start with `refs/heads`.

## [Notifications Improvements] - 2024-07-03

- Fixed a bug causing unread notifications to flicker.
- Updated HUD messages style for unread notification actions in the menu bar command.

## [Improvements] - 2024-06-20

- PRs: Add an option to omit team review requests from query results.
- Updated dependencies and removed high-security vulnerabilities.

## [Fix copy commit hash action] - 2024-06-17

- Fixes an issue where the copy commit hash action incorrectly copied the commit message instead of the commit hash.

## ["Create Pull Request" command] - 2024-06-03

- Added typeahead search for branch selection in Create PR command.

## [Add "My Projects" command] - 2024-04-25

- You can now see all of your projects into a single command called `My Projects`. You can also open/close projects. NOTE: This feature requires you to change the scope of your token to include `project` permissions. If you use the OAuth login, you will need to log in again to update the token.

## [Open in Browser as primary action setting] - 2024-04-22

- You can now set Open in Browser as a primary action for Pull Request searches.

## [Fix various icons and colors] - 2024-04-22

- Fixes icons for issues and pull requests in `Notifications` and `Unread Notifications` commands.
- Standardizes the color for all the accessories in `My Pull Requests`.
- Fixes an issue where the pull request icon color for the `My Pull Requests Menu Bar` was not adjusted for dark mode.
- Updates icons for `Open My Pull Requests` and `Open My Issues` menu items in the `My Pull Requests Menu Bar` and `My Issues Menu Bar` commands.

## [Updated metadata images] - 2024-04-22

- Updated outdated metadata images.

## [Polish menu bar icon] - 2024-04-22

- Use a new icon with indicator for unread state.
- Add a new preference item `Show unread count` to allow user to hide the unread count.

## [Fix recently closed issue] - 2024-04-18

- Only one issue or one PR was previously shown in `My Pull Requests` or `My Issues`. It's not the case anymore!

## [Opens notification discussion links] - 2024-04-08

- Opens GitHub links for notifications that point to a discussion directly.

## [Fix icon] - 2024-04-02

- Fixes icon for closed pull requests.

## [Fix various icons] - 2024-03-29

- Fixes icons for "Closed as not planned" and "Closed as completed" statuses in the `My Issues Menu Bar`.
- Fixes workflow icons for statuses other than "succeeded" in the `Unread Notifications` menu bar command.
- Changes the icon color of the `Unread Notifications` menu bar command for better visibility in the light menu bar.

## [Fix icon color for My Issues Menu Bar] - 2024-03-22

- Fixes an issue where icon colors for the `My Issues Menu Bar` were not adjusted to the dark mode.

## [Add "My Issues" command and improve "My Pull Requests"] - 2024-03-22

- You can now see all of your issues into a single command called `My Issues`. As a result, `Created Issues` and `Open Issues` were removed.
- The `Open Issues Menu Bar` is now renamed to `My Issues Menu Bar` and shows more issues such as the ones you created or the ones you were mentioned in.
- `My Pull Requests` should also load faster from now on.

## [Changing repo while creating issue or pull request clears title field] - 2024-03-21

- Fixes an issue where the title is cleared when changing repository for Create Issue and Create Pull Request.

## [Fix shortcut conflict + npm audit vulnerabilities] - 2024-03-21

- Fixes an issue where the shortcuts for `Re-Run Workflow` and `Delete Run` were not rendered.
- Fixes vulnerabilities reported by `npm audit`.

## [Remove Section in Action Panel] - 2024-03-21

- The "Mark as Read" action and its shortcut was not rendered and also did not work. This is because this action was considered a primary action. Removing this section makes the action secondary and it is now rendered and works as expected.

## [Accept Repository Invitations] - 2024-03-18

- When receiving a repository invite, the "Open in Browser" command failed with an API error. This change fixes the error by making it possible to accept repo invites or open the repo in the browser.

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
