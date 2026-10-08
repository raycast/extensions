# Network Drive Changelog

## [Remove Uncompulsory Dependency] - 2024-06-13

Change usage of `smbclient` to OSX system built-in `smbutil`, as a result user won't have to install `samba` via `brew` in order to use the extension

## [Initial Version] - 2024-05-29

Ability to list/mount/unmount the available SMB disk on certain domain/ip
- use `smbclient` to list available network disk on certain domain/ip with certain login credential (all configurable via the extension's settings), the smbclient can be installed via `brew install samba`
- use `mount` and `df` to get the information of the network disk mounted to the computer
- use applescript `mount volume "smb://..."` to mount network drive
- use `diskutil` to unmount network drive
