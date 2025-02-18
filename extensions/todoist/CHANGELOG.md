# Todoist Changelog

## [Add time format preference from Todoist preferences] - 2025-02-17

- Raycast now pulls your preferred time format preference from the Todoist user account's settings and then uses that when displaying time

## [Add Complete Task Shortcut Preferences] - 2025-01-31

- Adjusting shortcuts for the following task actions:
  - Complete Task - Now `⌘` + `Enter` (previously `shift` + `⌘` + `E`)
  - Open Task in Todoist - Now `⌘` + `O` (previously `⌘` + `Enter`)

## [Add Support for Task Deadlines] - 2025-01-31

It's now possible to specify a deadline when using the `Create Task` command. Deadlines are displayed in the task list and task details views.

## [Quick Add Task Improvement] - 2024-12-02

Added a pop to the root and cleared the search bar after creating a task for the `close window immediately` preference.

## [Menu Bar Command Fixes] - 2024-08-05

Changed Menu bar icon color contrast issue with certain wallpapers in light mode.

## [Focus Label] - 2024-07-12

Adds a preference to set a specified label for the task in focus. The label will be removed when the task is not in focus.
This helps filter in-focus tasks on Todoist UI. The label will only be applied if the preference textfield is not empty.

## [Todoist Quicklinks] - 2024-07-09

- Added a new action to create quicklinks for various views in Todoist (e.g., Today, specific projects, etc.).

## [Fixes] - 2024-07-03

Completing tasks or other action no longer throw errors if menu bar command is not activated.

## [Add time to Schedule Task action] - 2024-01-25

It's now possible to specify a time when scheduling a task from the list item.

## [Change Menu Bar Icon Color in Dark Mode] - 2024-01-22

Changed Menu bar icon color in dark mode to #e5e5e5.

## [Show filters and filter tasks] - 2023-12-18

You can now view your Todoist filters and see all tasks associated with a selected filter.

## [Focused task] - 2023-10-30

You can now directly open the focused task via a Raycast command.

## [Duration support] - 2023-09-20

You can now create tasks with durations in "Create Task," as well as choose dates with times.

## [View task in Raycast from menu bar] - 2023-06-29

When using menu bar you may want to take a closer a look at your task description without opening the Todoist app. This change adds a way to quickly preview any task from menu bar on Raycast floating window.

It also enhances user experience in the following ways:

- Add subtask count to the task detail view in Raycast, so you can quickly see how many subtasks you have for each task.
- Fix null issue when Editing task without changing any field (#7057)
- Truncate menu bar task content to 50 characters to improve user experience.

Happy viewing!

## [Subtasks on menu bar] - 2023-06-14

This update adds subtasks to the menu bar tasks options. Thanks to this change, you can now break down tasks on the app and work on them one step at a time while still using the menu bar for navigation.

Happy task breaking!

## [Show task count for projects] - 2023-06-07

This update adds a new feature to display the `task count` besides project name in the `Show Projects` view. Note it's set to off by default in the command's preferences.

## [Filter view menu bar] - 2023-06-05

This updates adds a new view on menu bar called filter. When set, you can specify a custom [Filter Query](https://todoist.com/help/articles/205248842) to only show those tasks that matter the most to you in the menu bar.

It also improves user experience by addressing the following bugs:

- Fix an issue grouping tasks by due date when local is not UTC.

Happy filtering!

## [Search command and bug fixes] - 2023-06-02

This update adds a new command called `Search`, allowing you to search among your Todoist tasks, projects, labels, and comments. Please note that the `All Tasks` view of the `Home` command has been moved to the `Search` command.

It also enhances the user experience by addressing and fixing several bugs:

- The `JS heap out of memory error` in the menu bar has been resolved (still not the case for other commands)
- The ability to focus on tasks outside the menu bar tasks has been added for improved usability
- The `Quick Add Task` command now works properly a fallback command
- The dates with a datetime should be placed in full dates sections

Happy searching!

## [Todoist v2] - 2023-05-12

The Todoist extension has been completely revamped for a cleaner, better and smoother Raycast experience. The goal of this extension is clear: make you able to use Todoist anytime, anywhere, for anything on your computer using the power of Raycast. This update is packed with new features, so let's jump right into them.

### Home Command

Exit `Today Tasks`, `Upcoming Tasks`, `Search Tasks`, `Completed Tasks`. Welcome `Home`. This brand new command allows you to see your different tasks views from within one command: inbox, today, upcoming, completed but also your project and labels views. Then, switch views very easily using `⌘` + `P`. Need a quick-access to a view? Select your favorite view, and press the `Create View Quicklink` action. Note it's also possible to configure the default view in the command's preferences.

### OAuth Integration

To start using the extension, you previously had to go to Todoist settings, then the developer section and then get your API key. That's not the best experience when using an extension. Now? Just connect your Todoist account with the new OAuth integration. Note that if you were using the token previously, you should stay logged in without any problems.

### Better performance and always fresh data

Navigating across the extension is now smoother and faster. Plus, your data can stay always fresh by activating the `Background Refresh` option in the `Menu Bar Tasks` command. This has been made possible by using Todoist's Sync API instead of the REST API. The Sync API is actually used by Todoist's own clients and also unlocks ton of new features, which brings us to the next feature...

### Assignee Support

Assignees are coming to the extension! It's now possible to see who's responsible for each task directly from Raycast but also who assigned you the task and the comment's authors. You can also assign a task to anyone and create a task with an assignee.

### Flexible Grouping and Sorting

One of the power of Todoist is being able to group and sort your different tasks views by due date, assignee, label, or priority. Well, why not do the same? Make use of the `Group By` action ( `⌥` + `⇧` + `G`), `Sort By` action (`⌥` + `⇧` + `S`), and `Order By` (`⌥` + `⇧` + `O`) and customize your task views independently from each other, the way you want it.

### Reminders

This update also adds support for reminders. It's now possible to see a task's reminders, create time reminders (`⌘` + `⇧` + `R`), create location reminders (`⌥` + `⇧` + `R`) using your pre-defined locations list, or delete reminders (`⌃` + `⇧` + `R`). Note that you won't be able to use reminder actions if you're not using Todoist Pro.

### Attachment Support

Need a file for a particular task? You can now add a file attachment from the `Create Task` command. Of course, it's also possible to add attachments by adding a new comment to a task.

### Label Improvements

There's also significant improvements to labels with this update: introducing the `Show Labels` command. This command allows you to view all labels, add or remove them to or from favorites (`⌘` + `⇧` + `F`), and delete them (`⌃` + `X`).

### Menu Bar improvements

The menu bar command also gets its own set of improvements:

- Hide the tasks count in the command's preferences if you want to have a cleaner (and maybe more stress-free) menu-bar
- Add a label or an assignee to a task
- Quickly access your tasks views (`Inbox`, `Today`, etc.), or other commands such as `Create Task` or `Create Project`
- Also, some bugs have been fixed which should make the menu-bar smoother to use

### Quality of Life Improvements

This changelog is getting long, isn't it? I'd be happy to tell you more about other updates but it'd get way longer so let's just put up a list for the rest of them:

- See your sub-tasks from a task list item (`⌘` + `⇧` + `T`)
- See the task's project section from within the list
- Set the parent task of another task if you want to make-it a sub-task (`⌘` + `⇧` + `M`)
- See the different reactions to your comment
- Refresh your data with (`⌘` + `R`)
- Better empty views (especially the today one!)
- See your team inbox in the `Show Projects` view
- Same order than Todoist in the today or upcoming view
- And other improvements and fixes I've probably forgotten.

This update paves the way for other features such as filters. I hope you enjoy it and that it'll make your Todoist experience on Raycast delightful.

## [Improvements & fixes] - 2023-04-12

- Add action to mark an already completed task as incomplete
- Add action to copy the title of a completed task
- Fix a bug where the "Today" view in the menu bar command would use the "Upcoming Days" settings
- Remove Markdown formatting from the focused task

## [Add various actions and new completed tasks command] - 2023-01-20

- Add new command to see your completed tasks
- Add new `Show Project` action
- Add `Duplicate Task` action
- Add `Move to Project` action
- Add `Show Project` action
- Remove `Group By` preferences in favor of an action
- Support lots more dates when scheduling tasks (thanks to the new `Action.PickDate` component)
- Use consistent project icons throughout all the commands

⚠️ If you were using the `Group By` preference, it's been replaced by a list item action. Now, select any item in the today or project list and press `⌥` + `⇧` + `G` to configure your view.

## [Menu bar fix] - 2023-01-10

- Fix focused task when not listed in menu bar

## [Menu bar improvements] - 2023-01-03

- Add possibility to specify the number of days in Upcoming view for Menu Bar

## [Menu bar command bug fix] - 2023-01-02

- Fixed an error that caused menu bar to throw an error

## [Optimizing title] - 2022-12-21

- Removed eventually markdown from titles.

## [Menu bar command for tasks] - 2022-11-19

- Upgrade `@raycast/api`
- Add a menu bar command that shows upcoming tasks/tasks for that day (can be changed via preferences)
- User can complete task, change due date, change priority, open task in Todoist and delete task from the menu bar

## [Migrate to Todoist REST API v2]

- Refactor the extension to use Todoist's REST API v2
- Support view style for projects (either list or board)
- Add new command called `Quick Add Task` replacing `Create Task in Inbox`: this new command allows users to add more info to their newly created tasks

## [Bunch of improvements] - 2022-09-22

- Upgrade the dependencies
- Improve destructive actions: apply styling and added descriptions for alerts.
- Move the specific commands preferences (today's group by options, projects group by options) in the command's preferences
- Use `@raycast/utils` data fetching hooks instead of `swr` enabling caching by default for every call in the extension 🚀
- Add "Open in Todoist app" action
- Add new "Create Task in Inbox" command
- Refactor "Create Task" and "Create Form" to use `useForm`
- Add validations to "Create Task" and "Create Form"
- Add draft values to "Create Task" command
- Add tooltips to task accessories
- Add "add new comment" action on task list

## [New tasks from projects and task actions in detail] - 2022-05-13

- Added the ability to add a new task from a project
- Shared the task actions between the task detail and the task list item
- Add flag icon for priorities in the detail view as well as in the action panel

## [Edit your projects] - 2022-04-30

- Added a new action on projects to edit them
- Added a new action on projects to add/remove them to/from favorites
- Added the project's color on the Search Projects command
- Removed the custom ordering of the tasks since Todoist already performs them
- Displayed the sub-tasks back in the project view

## [Add support for comments] - 2022-04-23

- Added support for comments on each task. It's now possible to add a new comment, edit it, delete it, or search through every comment's content.
- Reset the form focus to the first field when creating a project or a task.

## [New command for searching tasks] - 2022-04-13

- Added a new command to search across all your tasks with the ability to filter by project
- Added new scheduling options: "in two days" and "no due date"

## [More details and empty screens] - 2022-04-06

- Added detailed view of a task with metadata: title, description, project, due date (with time if any), priority, labels
- Added the ability to display many accessories of a task item in a list
- Added support for tasks due for a particular time
- Added empty screen when there are no tasks left for today
- Added empty screen when there are no tasks in a project. The user is prompted to create one.
- Added the possibility to edit a task's title and description
- Added support for sections in task creation. The sections change based on the selected project.
- Added the project info in the upcoming view
- Added the possibility to copy to clipboard a project or a task URL
- Fixed the date picker by allowing to pick only plain dates
- Improved the getting started documentation

## [Metadata] - 2022-03-23

- Add screenshots, categories, and changelog for the Raycast store
- Update the main `README.md` file to remove duplicated information

## [Minor improvements] - 2022-03-08

- Add "Clock" accessory icon if an exact time is set for a particular task
- Add the option to group the tasks by label in today's view and project's view

## [Fix timezone issues] - 2022-02-21

- Make sure that the due dates works properly across all timezones

## [Bunch of improvements] - 2022-02-09

- Add the ability to group tasks by priority or project in Today's view
- Add the ability to group tasks by priority or date in the project's view
- Add errors in every command if the token is wrong
- Add toast actions when creating a task: go to project or open task in the browser
- Add toast actions when creating a project: open project in the browser
- Rename priorities to match them with Todoist (priority 1 instead of urgent)
- Remember the project and the labels value in "Create task" form
- Remember the color value in "Create project" form
- Upgrade the dependencies

## [Create and delete projects] - 2021-12-22

- New command to create a Todoist project
- New action panel item to delete a project in the project's search with confirmation alert
- Add confirmation alert when deleting a task

## [Minor improvements] - 2021-12-14

- All tasks, including subtasks were shown at a project level. Now, only root tasks are shown to make the list easier to visualize. The user can still see its subtasks by opening the task in the browser
- Update dependencies

## [Bunch of improvements] - 2021-11-29

- Add ability to go to project when a new task is created
- Add loading state to different toasts
- Add an error when a user doesn't provide a title when creating a task
- Clear form when creating a task
- Add labels in task creation
- Support overdue tasks in today and upcoming view
- Improve documentation to make it more readable

## [Initial Version] - 2021-10-19

Initial Todoist extension along the following features:

- See the tasks due today
- See the upcoming tasks grouped by dates
- See all the projects and the tasks for each project
- Create a task with the following fields:
  - Title (markdown supported)
  - Description (markdown supported)
  - Due date
  - Priority
  - Project
