# Port Watcher Changelog

## [Initial Version] - {PR_MERGE_DATE}

- One list combining what is listening on localhost right now and the dev server profiles you declare
- Launch a profile and get an observed answer: listening on a real port, exited with its code and log, or still working
- Kill any listener with SIGTERM, with explicit SIGKILL escalation when a process ignores it
- Capture a profile from a running process: folder read from the system, run command inferred from the npm script behind it
- Run command suggestions read from evidence on disk — lockfiles, package.json scripts, manage.py, Cargo.toml, Makefile targets, index.html
- "Built with" tags read from declared dependencies, and a LAN tag on servers bound to every interface
