# Manual test cases for the checklist extension

## Test case 1: Create a new checklist
1. 🏃🏻 Press `CMD+N`
2. 🏃🏻 Enter a name for the checklist
3. 🏃🏻 Press `CMD+Enter`
4. 🔍 Should show an error (no taks added)
5. 🏃🏻 Enter a name for the first task
6. 🏃🏻 Press `CMD+Enter` to add the checklist
7. 🔍 Checklist should be added

## Test case 2: Add a new task to a checklist
1. 🏃🏻 Press `CMD+N`
2. 🏃🏻 Enter a name for the checklist
3. 🏃🏻 Enter a name for the first task
4. 🏃🏻 Press `CMD+N` to add a task
5. 🔍 Task should be added
6. 🏃🏻 Press `^+X` to remove task
7. 🔍 Task should be removed

## Test case 3: Start working on a checklist
1. 🏃🏻 Select Checklist and press `Enter`
2. 🔍 Checklist should be opened

## Test case 4: Finish a task
1. 🏃🏻 Select a task and press `Enter`
2. 🔍 Task should be done

## Test case 7: Share a checklist with others
1. 🏃🏻 Select a checklist and press `Shift+CMD+C`
2. 🔍 Clipboard should contain a stringified JSON

## Test case 8: Import a checklist from clipboard
1. 🏃🏻 Copy this to clipboard: `{"title":"Update Raycast Extension","tasks":[{"name":"Make NPM RUN BUILD work"},{"name":"Update README"},{"name":"Update screenshots"},{"name":"Update changelog"}]}`
2. 🏃🏻 Press `CMD+N` to create a checklist
2. 🔍 Checklist form should be filled with the imported data

## Test case 9: Delete a checklist
1. 🏃🏻 Select a checklist and press `^+Shift+X`
2. 🔍 Checklist should be removed

## Test case 10: Edit a checklist
1. 🏃🏻 Select a checklist and press `CMD+E`
2. 🏃🏻 Change the name of the checklist
3. 🏃🏻 Press `CMD+Enter``
4. 🔍 Checklist should be renamed