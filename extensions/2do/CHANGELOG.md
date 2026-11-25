# 2Do Changelog

## [Smart List Performance] - 2026-11-25

- Reuse the smart-list dropdown catalog for ten minutes to reduce 2Do calls when reopening View Tasks
- Refresh the catalog after task changes; selected smart-list tasks still load fresh

## [Tags Under List] - 2026-11-25

- Tags and New Tags now appear below List and Project or Checklist (when shown) in Add Task, Edit Task, and Add Link

## [Add Task Stays Open] - 2026-11-23

- Add Task now stays open and clears the form after saving a task (keeping the selected list), so you can add multiple tasks in a row
- Add Link returns to the cleared Link step after saving, ready for the next address

## [Projects and Checklists] - 2026-11-17

- Creating/Editing:
  - Put each task inside an existing project or checklist from its edit form
  - Create new tasks and allow to put in existing projects or checklists
  - Create new projects and checklists
- Show Items in Project or Checklist:
  - List a parent's items with Show Items on each parent
  - Add item to project or checklist with Add Item in Show Items
- View Tasks: show project or checklist completion progress as a ring calculated by percentage from `completed child tasks / total child tasks`
- If you complete a parent (project or checklist) with open tasks, it will ask if you want to complete the remaining open todos in the parent. You have a choice between "Not Now" and "Complete All".

## [Repeats and New Tags] - 2026-11-09

- Set how a task repeats in Add Task and Edit Task, and see the rule on repeating tasks in View Tasks
- New Tags field in Add Task and Edit Task, for tags not in 2Do yet
- A clear message when 2Do is too old for this extension, or not installed

## [Links and Actions] - 2026-11-07

- Add Link command that creates a task from a web address, optionally reading the page's title and description
- Set a task's 2Do action (link, call, message, email, visit, or Google search) when adding or editing it
- Run a task's action (⌘L), or choose from all of its links (⇧⌘L)

## [Initial Version] - 2026-11-01

- Add Task command with list, dates, priority, star, and tags
- View Tasks command with All, Today, Starred, Scheduled, Done, list, and smart list scopes
- Edit, complete, star, and open tasks from the list
