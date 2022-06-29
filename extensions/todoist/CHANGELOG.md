# Todoist Changelog

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
