# Cursor Directory

Access and search cursor rules from [cursor.directory](https://cursor.directory/) directly
for usage in the Cursor Code Editor.

## Usage

1. Launch Raycast and search `cursor directory` to execute the command.

2. Use fuzzy search to find cursor rules based on their titles.

3. Select a cursor rule to view details or copy content.

4. Press `Enter` to open the detail page, displaying author information
   and the full cursor rule.

5. From the detail page:

- Press `Enter` to copy & apply the cursor rule in the `.cursorrules` file in your project.

- Use the Action Panel to visit [cursor.directory](https://cursor.directory/) or share the cursor rule link.

6. You can star cursor rules to quick access them later. NOTE that the max number of starred cursor rules is 10.

7. If you want to modify the cursor rule locally, you can use the "Export and Edit" action to open the cursor rule as Markdown filein Cursor for editing. But make sure to install the shell command `cursor` first. (You can install it by pressing `Cmd + Shift + P` in Cursor and search for `Install cursor command`)

8. You can install the `degouville/cursor-recent-projects` extension to easily open recent projects in Cursor.

## Configuration

Access preferences through the Action Panel or Raycast preferences:

- Cache Duration: Cursor rule data is cached locally for 1 day by default.
- Show Detailed View: Toggle the display of detailed view in cursor rules list.
- Default Cursor Rules List: Choose to show all cursor rules or only popular ones in cursor rules list at launch.
- Export Directory: Set the directory to export cursor rules locally.
- Auto launch Recent Projects: Auto launch Cursor Recent Projects after copying a rule if you have the extension installed.
