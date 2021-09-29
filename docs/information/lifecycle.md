# Lifecycle

When a command is opened in Raycast, the command code is executed right away. If the extension exports a default function, this function will automatically be called. You can then [render](../api-reference/user-interface/rendering.md) a user interface or just perform logic and use other API methods. For commands with their `mode` property set to `default` \(instead of `view`\) in the package manifest, no user interface will be rendered when the command is performed in Raycast.

You can inspect the [Environment](../api-reference/environment.md) for extension information and paths or access [Preference Properties](../api-reference/preferences.md) for user-entered values that are passed to the command.

When the command is unloaded \(typically by popping back to root search\), Raycast unloads the entire command from memory. Note that there are memory limits for a command and if those limits are exceeded the command gets terminated.

Once we enable public distribution of commands in later releases, there will be additional integrity checks that ensure the installed package sources have not been modified before running the command.

