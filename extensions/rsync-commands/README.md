# Rsync Commands

Save your frequently used rsync commands and run them with ease.

#### Features:

1. Create and manage a list of frequently used rsync commands.
2. Supports all rsync options and SSH configuration details.
3. Add custom shell commands to run before and after the rsync command itself.
5. Run one of your commands directly from Raycast or copy it to the clipboard.

#### Requirements:

- rsync version 3+ (tested only on 3.2.3 so far).
- rsync has to be in your PATH.

#### Limitations:

- To use SSH sync, you need to have the relevant public key configured in the remote machine's "authorized_keys" file. Also, keys that requires a password cannot be used, since there is no good way of providing the password automatically for the rsync command. You can still use the extension to build and save your commands, and then enter the password when running the command manually in the terminal after copying it to your clipboard.
