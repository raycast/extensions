# Obsidian Tasks Changelog

## [Append priority instead of prepend] - 2025-10-16
- Update taskFormatter to append priority icon instead of prepending it. Prepending causes Obsidian to treat it
  as part of the description rather than as the priority. Appending it resolves this, allowing for searching
  and sorting using Dataview. 
- Ref [Issue #20725](https://github.com/raycast/extensions/issues/20725)

## [Show description in details] - 2025-06-30

- Add preference to show description in markdown (ref: [Issue #20035](https://github.com/raycast/extensions/issues/20035))
- Remove `Preferences` type definition as it is auto-generated

## [Include only current tasks] - 2025-05-20

- Add preference to include only current tasks

## [Initial Version] - 2025-04-11

- List tasks with sorting and filtering
- Add new tasks with due dates, priorities, and tags
- Edit existing tasks
- Mark tasks as complete
- Menubar integration showing highest priority task
- Support for Obsidian Tasks Plugin format
