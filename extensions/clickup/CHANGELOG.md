# ClickUp Changelog

## [Persist Priority on Capture] - 2025-06-19

- After creating a task, Raycast remembers the previously selected "Priority" (ref: [Issue #19884](https://github.com/raycast/extensions/issues/19884))
- Add some missing icons in **Tasks Explorer**

## [Create Task Without Priority] - 2025-06-16

- Add "Open in ClickUp" Action to many views allowing you to open the relevant item in Browser
- Change Priority Icons in "Capture" to Flags to match ClickUp UI
- Allow creating a task with no priority (ref: [Issue #19782](https://github.com/raycast/extensions/issues/19782))

## [Optionally Select Status In Capture] - 2025-05-23

- you can now select a status in "Quick Capture" command (statuses are fetched from the ListId you enter in Preferences) (ref: [Issue #19331](https://github.com/raycast/extensions/issues/19331))
- chore: update to use latest Raycast config

## [✨ AI Enhancements] - 2025-02-21

- AI Tools to:
    1. Get Teams
    2. Get Spaces
    3. Get Docs

## [Update - New Command] - 2024-09-10

- New `Docs Explorer` command - for now it shows docs and their pages
- Add List Sections to make it more evident where you are
- add metadata images

### Dev Notes
- Refactor by replacing previous hooks with a `usePromise` for unified error handling and loading states
- Migrate ray and related
- Improve types by minimizing use of "any"
- `useForm` in `Capture` command

## [Update] - 2024-04-17

- Added ability to view folderless tasks within the Tasks Explorer command

## [Update] - 2024-02-03

- Update Quick Capture error message and submitting form state

## [Update] - 2023-01-17

- Added new Quick Capture command
