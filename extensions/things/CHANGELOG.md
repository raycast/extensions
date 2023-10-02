# Things Changelog

## [Quick Add To-Do using natural language processing (NLP)] - 2023-09-05

Ever wanted to add a new to-do to Things with plain, natural text? Well, it's possible now with the new `Quick Add To-Do` command. Just type in your to-do text, maybe set some notes and checklist items and you're good to go. 

Under the hood, it'll analyze and process your text to extract these parameters:
- The title
- The start date
- The project or area the to-do belongs to
- The heading within a project to add to.
- The deadline
- The different tags
- If it's completed or canceled

Here are some examples:
- Book flights today in my Trips list
- Add milk to my groceries list for tomorrow with Errand tag
- Respond to mails
- Buy a new car by the end of the year
- Collect dry cleaning this evening at 6PM
- Fix landing page this friday in bugs heading of Revamp Homepage project
- Add a completed task called “Ship feature” to my Work list
- Respond to mails by this week-end

## [Big update] - 2023-08-11

A big update has been released for the Things extension. Here's what's new:

### New actions

You now have additional actions for your to-dos:
- Schedule
- Move to a project/area
- Edit the title or notes
- Add a tag
- Set a deadline
- Copy the URL as a formatted link
- Copy the title
- Copy the notes

But that's not all. There are also two new actions powered by AI to assist you in completing your to-dos:

- `Generate checklist with AI` to generate a checklist based on the to-do's title and notes
- `Make To-Do Actionable with AI` to make a to-do's title more actionable.

> Note: Some of these actions require an authentication token for security reasons. Please refer to the instructions in the README.md file to set it up.

### New command: Add New Project

You can now create new Things projects directly from Raycast. Similar to to-dos, you can add project notes, tags, schedule it, assign it to an area, set a deadline, and add some to-dos.

Need inspiration or a little boost to kickstart a project? Use the "Generate To-Dos with AI" action to let the AI fill out the to-dos for you.

### Menu bar improvements

The menu bar command also has its own set of imrpovements. Now you can perform more actions directly from the menu bar:

- Schedule a to-do
- Move a to-do to a project/area
- Complete any to-do

The menu bar also includes shortcuts to different lists in Things for quicker access (Today, Upcoming, Projects & Areas, Logbook, etc.). If you prefer a simple, clean list, note that you can disable this feature and keep only your to-do list for today visible.

### Other improvements

- Added support for drafts when creating to-dos
- Improved deadlines accessories
- Enabled markdown when adding a new to-do
- Improved date pickers to only show dates from now onwards
- Added icons to list accessories
- Added a new empty state
- Added a confirmation alert when deleting a to-do

## [Fix] - 2023-05-08

- Fixed encoding

## [Update] - 2023-03-17

Add the ability to copy the Things URI to the clipboard.

## [Update] - 2022-12-18

Added troubleshooting

## [Update] - 2022-07-11

Added support for Things beta.

## [Fixes and Updates] - 2022-03-02

- Updated the API
- Fixed a todo creation bug

## [Improvements] - 2021-12-03

- Add tags from project and area
- Add actions for project and area
- Display tags in list subtitle
- Add complete action
- Add "Mark as Completed"/"Mark as Canceled"/"Delete" actions
- Add "Add New To-Do" command
- Add fallback commands in show-list (search + create todo)
- AddNewTodo: separate form handling in 2 actions
- Better error handling: catch and display markdown error if things is not running
- Fix TypeScript error

## [Copy URL] - 2022-02-25

Added the option to view and copy the result url.

## [Initial Version] - 2021-10-20

Add Things Extension.
