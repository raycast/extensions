# T3 Code Changelog

## [Protocol v2 support] - {PR_MERGE_DATE}

- Waiting T3 Threads and Search T3 Threads work with T3 Code servers on orchestration protocol v2 as well as v1.
- The T3 Code app name is detected from the running server, so both the stable (T3 Code (Alpha)) and Nightly builds open and focus correctly. The `App Name` preference is now an optional override.
- Prompt T3 Code reports that it is not supported yet on protocol v2, where threads can only be created over WebSocket.

## [Initial Version] - 2026-10-01

- Prompt T3 Code: start a session with a prompt, choosing project, model, permissions and workspace.
- Waiting T3 Threads: active threads whose agent has stopped.
- Search T3 Threads: every live thread, by title, project or branch.
