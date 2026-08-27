# Domain Context

- **AeroSpace runtime**: The running window manager reached through its `aerospace` CLI. Runtime queries and operations belong behind `src/utils/aerospace.ts` so commands do not construct CLI arguments or interpret raw output.
- **Window snapshot**: A validated, point-in-time view of an AeroSpace-managed window, including its workspace, monitor, focus state, and application bundle path.
- **Workspace catalog**: The merged view of runtime workspaces, deduplicated apps, and configured workspace bindings. It can include configured workspaces with no open windows.
- **File configuration**: The complete TOML file at the path returned by `aerospace config --config-path`. This is the source users edit.
- **Loaded configuration**: The binding modes reported by the running process through `aerospace config --get . --json`. It is runtime truth for commands that trigger bindings, but AeroSpace currently exposes only `mode.*` values through this API.
- **Binding**: A mode-specific key name understood by AeroSpace. Raycast activates it with `aerospace trigger-binding`; it does not synthesize a macOS keyboard event.
