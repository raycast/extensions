## Common Directory

## Description

1. Quick access to frequently used folder directories.
2. Quickly Send files to the common directory, open directory or folder chosen manually



--------

*This is very important, so I'm putting it here, make sure to read all the warning tips*

*When using the Send File to command, please note the following warning tips*

***Warning***: 

- ⚠️You can hide the Raycast interface. Bug don't quit the extension when using it to move/copy files (Quitting the extension will cause the interruption of moving/copying files to fail and loss of files)
- ⚠️Do not use shortcut keys to call other commands or extensions when using it to move/copy files, this behavior will lead to quit this extension.
- ⚠️The operation of moving files with this extension cannot be reversed, so please operate with caution.

------


**Commands:**

- **Open Common Directory**: Quick access to frequently used folder directories
  - Open in Finder
  - Reveal in Finder
  - Copy Directory Path
  - Add Directory
  - Remove Directory
  - Rest All Rank
  - Toggle Detail

- **Add Common Directory**: Add frequently used folder directories
  - Add Directory
  - Fetch Directory
  - Choose Directory

- **Send File to**: Send files to the common directory, open directory or folder chosen manually
  - Copy File to Directory
  - Move File to Directory
  - Copy to Folder Chosen Manually
  - Move to Folder Chosen Manually
  - Add Directory
  - Remove Directory
  - Rest All Rank
  - Toggle Detail


**Preferences:**

- **Open Common Directory**:
  - More Directory: Show more directories
    - [ ] Open Directory: Directory of currently open Finder folders
  - Sort By: Commonly used directory sorting methods
    - Rank: Sorted by usage frequency
    - Name Up: According to the name ascending order
    - Name Down: According to the name descending order

- **Send File to**:
  - More Directory: Show more directories
    - [ ] Open Directory: Directory of currently open Finder folders
  - Advanced Operations:
    - [ ] Open Destination Directory: Open the destination directory
    - [ ] Delete Empty Directory: After successfully moving out the files, delete the original folder if the folder is empty.

------

🌟**Extra Tips**:

- When you use the **Common Directory** command, You can tell if the path is valid by the icon at the end of the list item.

- When you use the **Add Directory** command, the extension will automatically detect the path to the Finder folder.
  - This command will detect the selected folder first.
  - If there are no selected folders, the folder that gets the focus (activated by the mouse) is detected.
  - You can also fill in the folder directory manually (Mac's native way of choosing folders).


- When you use the **Send File to** command, the extension will automatically detect the file you select.
  - Please keep the Finder in focus (use mouse clicks to activate or otherwise switch the window to ensure it is at the top), and you need to have the files or folders selected.
  - This command supports batch operation, you can select multiple files and folders at a time.
  - You can select the Common Directory and Open Directory as destination path, and you can also select them manually (Mac's native way of choosing folders).
  
- 🌟🌟🌟**The principle of handling duplicate file names**🌟🌟🌟
  - Due to UI limitations, this extension only provides two options (Cancel and Overwrite All) when it detects renamed files(folders).
  - When you want to send a folder to the directory where its parent folder is located, if the file has the same name as the parent folder, it will be ignored (it will not be moved or copied).
  - The files(folders) cannot be sent to the '/User' directory.

- Sometimes Raycast does not detect the selected files (folders), this is Raycast's bug, you just need to restart Raycast.