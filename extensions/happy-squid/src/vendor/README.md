# Vendored files

These files contain the declarations this extension and its tests need from
Happy Squid's shared source, including their local dependencies. Internal
comments and unused declarations are omitted. The implementations stay the same:

| file                | what it is                                                    |
| ------------------- | ------------------------------------------------------------- |
| `task-control.ts`   | the task requests and the task state the backend answers with |
| `task-stream.ts`    | the live updates a productivity check streams                 |
| `raycast-auth.ts`   | the one-time handoff that connects Raycast to an account      |
| `task-durations.ts` | labels for task duration choices                              |
| `format.ts`         | how a task's time is written                                  |

Edit them in Happy Squid's source rather than here; this folder is regenerated.
