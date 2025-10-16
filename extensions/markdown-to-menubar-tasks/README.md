# Markdown to Menubar Tasks

A Raycast extension that displays tasks from a markdown file in your menubar.

## Features

* Displays tasks from a markdown file in your menubar
* Groups tasks by sections (markdown headers)
* Shows task completion status
* Allows toggling task completion status directly from the menubar
* Handles markdown links within tasks
* Quick access to edit your tasks by clicking on section titles or summary
* Ability to hide sections from the menubar display

![App preview](./assets/screenshot.png)

## Setup

1. Install the extension
2. Set the path to your markdown file in the extension preferences
3. Run the "Show Tasks in Menubar" command

## Markdown Format

For a complete example, check out the `sample-tasks.md` file in this repository.

The extension expects tasks to be formatted as:

```markdown
# Section Title

- [ ] Task 1
- [x] Task 2 (completed)
- [ ] Task with [link](https://example.com)
```

Each task should:
* Start with `- [ ]` for incomplete tasks or `- [x]` for completed tasks
* Be grouped under markdown headers (# Section Title)

### Ignoring Sections

You can hide entire sections from appearing in the menubar by prefixing the section title with `IGNORE` :

```markdown

## IGNORE Archive

- [x] Completed task that won't show in menubar
- [ ] Task in progress that should be hidden
```

This is useful for:
* Archiving completed tasks
* Hiding reference or someday/maybe tasks
* Keeping personal tasks separate from work tasks
* Maintaining low-priority tasks in the same file without cluttering the menubar

Example organization:

```markdown
# Daily Tasks
- [ ] Current high-priority tasks

# Work Projects
- [ ] Active work items

# IGNORE Someday
- [ ] Low-priority ideas for later

# IGNORE Completed
- [x] Tasks from previous weeks
```

### Tasks with Links

When a task contains a markdown link (e.g., `- [ ] Check [docs](https://example.com)` ):

* The task is displayed as a submenu in the menubar
* The link text is shown with a ↗ icon
* The submenu has two options:
  + **Open Link**: Opens the URL in your default browser
  + **Mark as Complete/Incomplete**: Toggles the task completion status

## License

MIT
