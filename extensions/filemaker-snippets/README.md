# Claris Snippets

Create and use snippets for FileMaker Pro.

This extension uses FmClipTools to capture transform the FileMaker clipboard data to FM Objects, saving the XML representation of the snippet to a file on disk. You can specify multiple folders on your computer on which to save your snippets, allowing you to share collections of snippets with other developers, or sync that folder with a team using a cloud service like Dropbox or Google Drive.

Additionally, this extension has bonus commands for searching and quickly launching your Favorite and Recent files as recognized by the FileMaker Pro application.

## How to use

To create a new snippet, copy something to the clipboard from FileMaker. This can be a script, script step, layout objects, field definitions, etc. Then use the "Create Snippet" command and fill out the form to give the snippet a name, description, and optional keywords.

To use a previously saved snippet, open the "View Snippets" command and search for the snippet you want to use. Then simply press the return key to copy that snippet to your clipboard as a FileMaker object, ready for the pasting!

## Git-based Locations

You can share your snippets with the world by posting them to a git repository. This is a great way to share snippets with your team, or even the entire Claris community! To use snippets from a git repository, add a new location from the "Manage Snippet Locations" command add choose "Git Repository" as the location type. Then enter the URL to the git repository.

Snippets in git repositories are read-only, but will be updated periodically from the git repository without any user knowledge of git. If you want to maintain the snippets stored in a git repo, it's better to clone the repo to your local machine and use the "Local Folder" location type instead.

#### Git not installed error

If you get an error saying "Git not installed" when trying to add a git repository, you need to install git on your computer. You can download git from [https://git-scm.com/download/mac](https://git-scm.com/download/mac).
