# Rsync Commands

Save your commonly used rsync commands in one place and run them with ease. Supports SSH endpoint configuration together with all the options supported by rsync.

#### Features:

1. Create, update, delete and duplicate pre-configured rsync commands.
2. Pin your most used commands.
3. Run one of your saved commands directly from Raycast.
4. Copy a rsync command to the clipboard to run it manually.

#### Requirements:

- rsync version 3+ (only tested on 3.2.3 so far).
- rsync has to be in your PATH.

#### Limitations:

- To use SSH sync, you need to have the relevant public key configured in the remote machine's "authorized_keys" file. Also, "PasswordAuthentication" cannot be enabled for SSH on the remote machine since there is no good way of providing the password automatically for the rsync command. When Raycast provides a input modal, we can probably enter the password in the modal if required, but until then this is not possible.
