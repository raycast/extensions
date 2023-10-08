# Things

Search and manage your Things to-dos from Raycast.

## Authentication token

The extension uses the [Things URL Scheme](https://culturedcode.com/things/support/articles/2803573/) under the hood to enable certain features, such as scheduling a to-do, or moving a to-do to a project/area. For security reasons, these operations require an authentication token that you can set by following these instructions:

1. Get your authentication token in `Things → Settings → General → Enable Things URLs → Manage`.
2. Paste the token in the extension's preferences.

## Troubleshooting

If you don't see any of your to-dos in any commands, please make sure Things is installed and running before using this extension. If Things is running, you may need to grant Raycast access to Things in `System Settings > Privacy & Security > Automation > Raycast > Things`.