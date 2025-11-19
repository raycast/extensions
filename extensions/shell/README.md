# shell

Execute shell commands from Raycast on macOS and Windows. Run commands inline or toggle the **Use External Terminal** preference to open them in iTerm/kitty/Warp/Ghostty on macOS or in PowerShell, PowerShell 7, or Command Prompt on Windows.

## Windows beta workflow

Because the Raycast CLI still writes dev builds to `~/.config/raycast`, Windows users should run the following commands to build and sideload the extension into the `raycast-x` directory that the beta app watches:

```pwsh
pwsh
bun run build:windows
```

`install-windows` copies the freshly built bundle (or the CLI-installed folder, if present) into `~/.config/raycast-x/extensions/shell`, so the Raycast beta picks up the update immediately.
