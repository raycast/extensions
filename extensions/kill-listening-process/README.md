# Kill Listening Process

This extension kills the process that is listening on a given port.
It takes one argument which is a port number.

This functionality is especially useful for web developers
that are testing an app by running a local HTTP server.
They may have many terminal windows open.
They attempt to start a server in one of them,
only to get an error because the port is in use.
Rather that toggling through all their terminal windows to
find the one that is using the port and killing it by pressing ctrl-c,
they can use this extension and simply enter the port number.

All output from the "Kill Listening" command is in the form of a toast.
If an non-integer port value is entered,
the toast message says "The port must be an integer."
If no process is listening on the port,
the toast message says "No process is listening on port ...".
Otherwise the toast message says "Process {pid} was killed."

The extension "Port Manager" can also do this,
but it requires many more steps.
Users must start the "Open Ports" command,
filter the list to show only the process listening on a given port,
press cmd-k to view the available actions,
select the "Kill..." action,
add select "Kill SIGTERM" or "Kill SIGKILL".
