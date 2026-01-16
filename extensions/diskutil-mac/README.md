# Diskutil

Welcome to my extension! I hope you like it :)

If you have any ideas, just open a feature request or issue on Github via the Raycast Store page.

## Functionality

The usage is fairly intuitive. Each disk has multiple actions in Raycast which are self-explanatory and change based on the type and status of the disk/volume. Just try it!

It supports a variety of diskutil-related commands, like unmount, eject, EFI partition mounting, and more. All with shortcuts and a GUI.

### Some highlights are
- Quick overview of all disks, volumes, and partitions including identifier, name, size, capacity, and mount status
    - Several views available for viewing sizes, toggleable via `CMD+.` (UX/UI improvement feedback welcome)
- Detailed information for each disk (automatically parsed from `diskutil info`)
    - Switchable to alternative info from `diskutil info -plist` which shows more information including SMART data
- Mounting of EFI partitions through an automated sudo workflow

It does not support disk formatting, partitioning, or other destructive write actions. However, it is easy to select a disk and switch to the terminal via `CMD+T` for manual diskutil commands.

## Approach

This extension is basically a combination of the terminal command `diskutil` with some regex and plist parsing.

It's probably not the most performant approach, but it provides all the information from `diskutil list` and `diskutil info` with added functionality and a user-friendly interface.


## Known Issues

- The extension is not very performant, especially with HDDs, due to the nature of fetching data from the command-line `diskutil list` command.
- SD cards inserted into the internal card reader are reported as internal disks.
