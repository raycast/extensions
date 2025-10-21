# Diskutil

Welcome to my extension! I hope you like it :) If there is anything to improve, just contact me and I'll see what can be done

## Functionality

The usage is fairly intuitive. Each disk has multiple actions in raycast which are self-explanatory and change based on the type and status of disk/volume. Just try it!

It supports a variety of diskutil related commands, like unmount, umount, eject efi-partition mounting and more. All with shortcuts and GUI.

It does not support disk formatting, partitioning or other destructive writing actions, however it is easy to select the disk and switch to the terminal for manual diskutil commands.

## Approach

This extension is basically just a combination between the terminal command "diskutil" and lots of regex.
It's probably not the most performant way, but it provides all information provided by diskutil and adds fun functionality. 


## Known Issues
- The extension is not very performant especially with HDDs due to the nature of fetching data from the command-line diskutil command.
- SD-Cards injected into the internal card reader are reported as internal disks.
