# Move File out

Quickly take files out and move them to directory where parent folder is located.

**Command**:

- **Move File out**: Move File out of the parent folder.
- **Copy File out**: Copy File out of the parent folder.



***Warning***: (When using the  extension, please note the following points)

- ⚠️You can hide the Raycast interface. But don't quit the extension when using it to move/copy files. (Quitting the extension will cause the interruption of moving/copying files to fail)
- ⚠️Do not use shortcut keys to call other commands or extensions, this behavior will lead to quit this extension. (This will result in quitting this extension)
- ⚠️The operation of moving files with this extension cannot be reversed, so please operate with caution.



**Preference**:

- [ ] Open Destination Directory: After successfully moving out the files, open the destination folder.
- [ ] Delete Empty Directory: After successfully moving out the files, delete the original folder if the folder is empty.

**Notes on use**:

- Because of UI limitations, when detecting duplicate files, only the "Cancel" and "Overwrite All" options are provided.

- This folder will be ignored when it has the same name as the parent folder.

⚠️**Caution**: The file cannot be moved to the /User directory.
