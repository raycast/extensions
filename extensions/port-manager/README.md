# Port Manager Extension

List open ports in Raycast and the menu bar, and kill the processes associated with these ports. Choose between two termination signals: the default `SIGTERM` signal or the `SIGKILL` signal, which cannot be ignored by the process.

You can copy information about the process, including PID, name, executable path, parent PID, parent executable path, user name, and user UID. Alternatively, you can copy a kill command to be pasted into a terminal.

The "Kill Listening Port" command simplifies the steps
to quickly kill the process that is listening on a given port.

This functionality is especially useful for web developers
that are testing an app by running a local HTTP server.
You may have many terminal windows open.
You attempt to start a server in one of them,
only to get an error because the port is in use.
Rather that toggling through all your terminal windows to
find the one that is using the port and killing it by pressing ctrl-c,
you can use this command and simply enter the port number.

All output from the "Kill Listening" command is in the form of a toast.
If an non-integer port value is entered,
the toast message will say "The port must be an integer."
If no process is listening on the port,
the toast message will say "No process is listening on port ...".
Otherwise the toast message will say "Process {pid} was killed."
