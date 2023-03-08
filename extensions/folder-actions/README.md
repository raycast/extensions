# Folder Actions

Detect when files are added or removed from folders, then run actions according to your specifications.

## Commands

- New Folder Action
    - Configure a new folder action via an intuitive form.
- Manage Folder Actions
    - View and manage your configured folder actions.
- Check For Changes
    - Check for newly added or removed files in all configured folders.

## Example Uses

- Automatically sort downloaded files into folders
- Open the downloads folder whenever you download a file
- Get notifications when someone adds a file to a shared folder
- Automatically copy all files added to a folder to another drive
- Create reminders to review files added to a specific folder, using Raycast Deeplinks
- Create a note summarizing changes to a folder over the course of the day

## Placeholders

You can use the following placeholders in your actions that will be replaced with the corresponding information when the action runs:

- {item} - The path of the added or removed file
- {dir} - The path of the folder where a change was observed
- {event} - A one-word summary of the event, either "Added" or "Removed"