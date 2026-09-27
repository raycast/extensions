# Vendored files

These files are copied byte for byte out of Happy Squid's own source, where
they are maintained, so this extension speaks to the Happy Squid backend and
spells a task's time exactly as the Happy Squid apps do:

| file                  | what it is                                                    |
| --------------------- | ------------------------------------------------------------- |
| `task-control.ts`     | the task requests and the task state the backend answers with |
| `task-stream.ts`      | the live updates a productivity check streams                 |
| `raycast-auth.ts`     | the one-time handoff that connects Raycast to an account      |
| `task-durations.ts`   | the task lengths the apps offer                               |
| `browser-settings.ts` | the address that opens Happy Squid's settings                 |
| `format.ts`           | how a task's time is written                                  |

Edit them in Happy Squid's source rather than here; this folder is regenerated.
