# Port Manager Extension

List open ports in Raycast and the menu bar, and kill the processes associated with these ports. Choose between two termination signals: the default `SIGTERM` signal or the `SIGKILL` signal, which cannot be ignored by the process.

You can copy information about the process, including PID, name, executable path, parent PID, parent executable path, user name, and user UID. Alternatively, you can copy a kill command to be pasted into a terminal.

The "Kill Listening Port" command simplifies the steps
to quickly kill the process that is listening on a given port.
All output from the command is displayed in toast messages.
