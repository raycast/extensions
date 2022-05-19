# Rsync Commands

Save your commonly used rsync commands in one place and run them with ease. Supports SSH endpoint configuration together with all the options supported by rsync.

#### Features:

1. Create, update, delete and duplicate pre-configured rsync commands.
2. Select rsync options and configure SSH connection details if needed.
3. Add custom commands to run before and after the rsync command itself.
5. Run one of your commands directly from Raycast, or copy a command to the clipboard to run it manually.

#### Requirements:

- rsync version 3+ (tested only on 3.2.3 so far).
- rsync has to be in your PATH.

#### Limitations:

- To use SSH sync, you need to have the relevant public key configured in the remote machine's "authorized_keys" file. Also, Keys that requires a password cannot be used, since there is no good way of providing the password automatically for the rsync command. You can still use the extension to build and save your commands, and then enter the password when running the command manually in the terminal after copying it to your clipboard.
