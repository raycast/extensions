# Rsync Commands

Save your commonly used rsync commands in one place and run them with ease. Supports SSH endpoint configuration together
with all the options supported by rsync.

#### Features:

1. Create, update, delete and duplicate pre-configured rsync commands.
2. Select rsync options and configure SSH connection details if needed.
3. Configure custom commands to run before and after the rsync command itself.
4. Pin your most used commands.
5. Run one of your save commands directly from Raycase.
6. Copy a rsync command to the clipboard to run it manually.

#### Requirements:

- rsync version 3+ (tested only on 3.2.3 so far).
- rsync has to be in your PATH.

#### Limitations:

- To use SSH sync, you need to have the relevant public key configured in the remote machine's "authorized_keys" file. Also, "PasswordAuthentication" cannot be enabled for SSH on the remote machine since there is no good way of providing the password automatically for the rsync command. When Raycast provides a input modal, we can probably enter the password in the modal, if required, but until then this is not possible.

#### Known Issues:

- After first selecting `Source` or `Destination` for `SSH` in your commands, you can't simply swap to the other option without first selecting `None`. I can't figure out why this doesn't work since the state for where the fields should render is updating correctly. The view doesn't seem to agree with this somehow and refuses to change position of the fields. 
h
