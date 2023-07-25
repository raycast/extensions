# Figma file search

![screenshot](./metadata/figma-files-raycast-extension-1.png)

Figma file search helps you quickly open a Figma file from anywhere on your mac. It's packed with features like,

1. Browsing multiple teams of the same organisation
2. Support for opening a specific branch of a file
3. Support for opening a specific page of a file
4. Menu Bar command for quick access to files

Note - Currently, this extension only works with team accounts. Drafts are not supported due to a Figma API limitation.

## Setting up the Extension

1. Locate your team ID. Do this by visiting Figma.com and click the team name you wish to use. In the URL, copy the ID that comes BETWEEN the word `/team/` and BEFORE your actual team name. You can also right-click on the team name in the Figma Desktop app sidebar and copy the link.

> Example - https://www.figma.com/files/team/12345678987654321/NameOfTeam...

The extension supports multiple teams. If you have more than one team, separate the IDs with a comma when entering them in the preferences.

> Example - 12345678987654321,98765432123456789

2. Create a Personal Access Token. Do this by clicking on your avatar on Figma.com (or desktop app) and go to settings. Scroll down to Personal Access Token and create a new one to use with Raycast.

Paste both of these into the Raycast preferences for this extension.
