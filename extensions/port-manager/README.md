# Port Manager Extension

The Port manager extension lists open ports and allows to [kill](https://ss64.com/osx/kill.html) the processes which open them. It allows killing either with the default `SIGTERM` signal or `SIGKILL``, which can't be ignored by the process.

It also offers the ability to copy information about the process (PID, name, path of the executable, parent PID, path of the parent executable, user name, user UID) or a `kill` command to paste in a terminal.

## Use Sudo

The settings provide the option to *run `Isof` and `kill` commands with sudo (as root)*, which is deactivated by default. Before activating the option, make sure your user is set up for [passwordless use of the sudo command](https://osxdaily.com/2014/02/06/add-user-sudoers-file-mac/). However, if you don't already know what this means or how to do it, you **probably shouldn't do it**. Doing it poses an considerable security risk and (if done wrongly) might break your macOS installation. If you still wanna do it, make sure to use `visudo`. **You have been warned**.

Despite the aforementioned risks, I included the option because it adds an essential functionality: To see processes which are not owned by your own user.
