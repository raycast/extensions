# tw

A TaskWarrior extension

## Searching

- By tag: _`+home`_
- By project: _`@work`_

## Filtering

- **All:** Pending, completed and deleted tasks
- **Next:** Most urgent tasks _`(default)`_
- **Active:** Started tasks
- **Blocked:** Tasks that are blocked by other tasks
- **Blocking:** Tasks that block other tasks
- **Overdue:** Overdue tasks
- **Completed:** Tasks that have been completed

## Shortcuts

|                Shortcut                | Description                             |
| :------------------------------------: | --------------------------------------- |
|       <kbd>⌘</kbd> <kbd>p</kbd>        | Change Filter                           |
|       <kbd>⌘</kbd> <kbd>k</kbd>        | Show Actions                            |
|       <kbd>⌘</kbd> <kbd>n</kbd>        | New                                     |
|       <kbd>⌥</kbd> <kbd>↵</kbd>        | Edit                                    |
|       <kbd>⌘</kbd> <kbd>↵</kbd>        | Done                                    |
|       <kbd>⌘</kbd> <kbd>z</kbd>        | Pending _`(if done)`_                   |
|       <kbd>⌘</kbd> <kbd>s</kbd>        | Start Working                           |
|       <kbd>⌘</kbd> <kbd>s</kbd>        | Stop Working _`(if started)`_           |
|       <kbd>⌘</kbd> <kbd>⌫</kbd>        | Delete                                  |
|       <kbd>⌘</kbd> <kbd>⌫</kbd>        | Purge _`(if deleted)`_                  |
| <kbd>⌘</kbd> <kbd>⌥</kbd> <kbd>p</kbd> | Set Project                             |
| <kbd>⌘</kbd> <kbd>⌥</kbd> <kbd>t</kbd> | Set Tag                                 |
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>p</kbd> | Set Priority                            |
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>d</kbd> | Set Due                                 |
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>r</kbd> | Reload All _`(tasks, tags & projects)`_ |
|       <kbd>⌥</kbd> <kbd>→</kbd>        | Show Next View _`(on list)`_            |
|       <kbd>⌥</kbd> <kbd>←</kbd>        | Show Previous View _`(on list)`_        |
|       <kbd>⌥</kbd> <kbd>p</kbd>        | New Project _`(on form)`_               |
|       <kbd>⌥</kbd> <kbd>t</kbd>        | New Tag _`(on form)`_                   |

## Configuration

Due to different Homebrew installation paths on the new Apple silicon Macs, please provide a path to your installation of Taskwarrior. Just run `which task` from your terminal and copy and paste the result.

## Screencast

1. Configuration
   1. Configure Taskwarrior path
2. Basics 2. Accessories 3. Details
3. Navigation
   1. All Tasks
   2. Tasks by project
   3. Tasks by tag
   4. Go to next task view
   5. Go to previous task view
4. Searching
   1. Search by Description
   2. Search by Project
   3. Search by Tag
5. Managing Tasks
   1. View Details
   2. Status
      1. Start
      2. Stop
      3. Done
      4. Undone
      5. Delete
      6. Purge
   3. Priority
      1. Set priority
      2. Remove priority
   4. Project
      1. Set project
      2. Remove Project
   5. Tags
      1. Add tag
      2. Remove tag
   6. Due date
      1. Set due date
      2. Remove due date
6. Creating tasks
   1. Create basic tasks
   2. Create task with priority, project, tags and due date
   3. Create with new project
   4. Create with new tag
7. Editing tasks
   1. Edit description
   2. Edit priority
   3. Edit project
   4. Edit tags
   5. Edit due date

## Similar Projects

- [Taskwarrior integration to Raycast][1]

## References

- [Taskwarrior][0]

[0]: http://taskwarrior.org "Taskwarrior"
[1]: https://raycast.com/yosy2010/raytaskwarrior "Taskwarrior integration to Raycast"
