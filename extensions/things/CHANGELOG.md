# Things Changelog

## [Improved Project Handling] - {PR_MERGE_DATE}

- Added Update and Delete project tools with proper Things URL scheme support
- Improved project data handling and type safety with separate parameter types for add/update operations
- Restricted `Move To` command for projects to list only Areas (prevents invalid moves)
- Enhanced code organization by extracting types to dedicated types.ts file

## [Fix Error on Task Update] - 2025-07-09

- Fix JXA errors when updating to-dos via actions

## [Improved Project Detection] - 2025-07-09

- Improve detection mechanism for projects to not depend on the existence of a project
- Prevent crashes when receiving an `undefined` value from Things via JavaScript for Automation (JXA)
- Improve detection of `PERMISSION_DENIED` errors (`-1743` error code)

## [Enhanced Error Handling] - 2025-07-07

- Improved error messages with specific troubleshooting steps for Things connection issues
- Added detailed guidance for permission errors and automation setup in System Settings
- Replaced generic "Things Not Running" message with actionable error screens and retry functionality

## [Fix Project Updates] - 2025-07-02

- Fixed update actions failing when used on projects in lists. Projects now use the correct `things:///update-project` URL scheme instead of the regular `things:///update` scheme used for to-dos.

## [✨ Reminders] - 2025-05-06

- Update the "Today" and "Upcoming" lists to allow updating to-do's reminders.
- Fixed issue with the Deadline action to correctly remove a deadline from a to-do.

## [✨ Fix Complete Menu Bar Action] - 2025-04-25

- Fix `Complete` menu bar action to mark the first incomplete to-do as complete, rather than completing the first item in the list, even if it is already marked as completed.

## [✨ Menu Bar To-Do] - 2025-04-25

- Update the menu bar to display only incomplete to-dos from today’s list

## [Detect URL in Notes] - 2025-04-11

- Detect a URL in to-do notes and offer `Open URL From Notes` and `Copy URL From Notes` actions.

## [✨ Improved Error Handling] - 2025-04-07

- Fixed an issue that caused the application to crash when users attempted to update a to-do item from the menu bar without a valid authentication token.

## [✨ AI Enhancements] - 2025-02-21

## [Focus Input Fields] - 2024-10-25

- Add shortcuts to focus the input fields in both the `Add New To-Do` and `Add New Project` commands.

## [Quick To-Do Fixes] - 2024-08-19

- Quick To-Do Command: Disable Automatic Date (when & deadline), List parsing when AI is not enabled in preferences/is not available via environment.

## [Quick To-do Improvements] - 2024-08-05

- Preference to disable date parsing for to-do classification, sending all to-do(s) to inbox.
- The title input will still be parsed for assigning deadlines and list name followed with '#' (case-insensitive).

## [Fix Generate Checklist with AI] - 2024-07-30

- Action to "Generate Checklist with AI" only visible if the user has access to AI.
- Fixed issue where all checklist items were being generated in French.
- Fixed issue where checklist items started with a hyphen even though explicitly prompted not to.

## [Fix tags for new issues] - 2024-07-24

- [#13560](https://github.com/raycast/extensions/issues/13560): Tags are correctly appended to the deeplink while creating new to-do(s).
- Updated dependencies and resolved security vulnerabilities.

## [Add Status Icons in Menu Bar] - 2024-04-16

- It's possible to see which to-do is completed, canceled, or to-do in the menu bar command.

## [Minor improvements] - 2023-10-31

- Use the Things flat icon in the menu bar and actions to make it stand out
- Add a preference to hide the top Things to-do in the menu bar

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
- Fixed a to-do creation bug

## [Improvements] - 2021-12-03

- Add tags from project and area
- Add actions for project and area
- Display tags in list subtitle
- Add complete action
- Add "Mark as Completed"/"Mark as Canceled"/"Delete" actions
- Add "Add New To-Do" command
- Add fallback commands in show-list (search + create to-do)
- AddNewToDo: separate form handling in 2 actions
- Better error handling: catch and display markdown error if things is not running
- Fix TypeScript error

## [Copy URL] - 2022-02-25

Added the option to view and copy the result url.

## [Initial Version] - 2021-10-20

Add Things Extension.
