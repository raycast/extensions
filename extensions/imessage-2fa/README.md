# 2FA Code Finder

Find Two Factor Authentication codes from iMessage and Email

![](https://raw.githubusercontent.com/yuercl/extensions/main/extensions/imessage-2fa/metadata/preview.png)

![](https://raw.githubusercontent.com/yuercl/extensions/main/extensions/imessage-2fa/metadata/preview_detail.png)

## Requirements

### For Email Support
- You must have at least one email account set up in the native Apple Mail app
- Raycast must be granted automation permissions for Mail.app
- Go to System Settings > Privacy & Security > Automation and look for Raycast and enable Mail

## Performance Tips
- It's recommended to keep the search window small and fast (e.g. 10 minutes) as 2FA codes typically expire quickly anyway

## Preferences

All preferences can be customized through `Raycast Settings > Extensions > 2FA Code Finder`

| Name              | Description                                           | Default Value | Required |
| ----------------- | ----------------------------------------------------- | ------------- | -------- |
| `Enabled Sources` | Choose which sources to enable (iMessage, Email, Both)| `Both`        | `false`  |
| `Default View`    | Default source to show in the list                    | `All Sources` | `false`  |
| `Search unit`     | Temporal unit type for searching messages             | `Minutes`     | `false`  |
| `Search amount`   | Number of units to look back when searching           | `10`          | `false`  |
