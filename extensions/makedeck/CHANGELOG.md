# Makedeck Changelog

## [Services outside makedeck] - 2026-11-12

- Shows dev services started outside makedeck (e.g. by a coding agent) in their project, marked "outside makedeck", with their ports.
- Shows their log if their output goes to a file, and lets you stop them.
- "Move to makedeck" stops them and starts the project in makedeck instead.

## [Initial Version] - 2026-11-06

- List makedeck services grouped by project, with live logs.
- Open a service in Terminal, stop or restart it, restart or stop a whole project.
- Stop Project runs `make dev-stop` if make knows the target, including from included files.
