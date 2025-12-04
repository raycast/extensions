# 2FA Code Finder

View 2FA codes from iMessage and Email (Apple Mail or Gmail) in Raycast.

## Features

- Find 2FA codes in iMessage and Email messages
- Detect and open verification or sign-in links in emails directly
- Support for both Apple Mail and Gmail as email sources
- Configurable search window (minutes, hours, or days)
- Option to ignore already read messages
- Real-time code detection and updates

## Setup

### Basic Setup

1. By default, the extension uses Apple Mail as the email source, but you can change that to be Gmail OAuth
2. If you want to avoid the Mail app being opened, you can set "Enabled Sources" to "iMessage" only in the extension settings and only iMessage will be taken into account

## Preferences

All preferences can be customized through `Raycast Settings > Extensions > iMessage 2FA`

| Name | Description | Default Value | Required |
| --- | --- | --- | --- |
| `Enabled Sources` | Choose between iMessage, Email, or both | `both` | `true` |
| `Email Source` | Choose between Apple Mail or Gmail | `applemail` | `true` |
| `Gmail OAuth Client ID` | Client ID for Gmail authentication | - | Only if using Gmail |
| `Default View` | Default source to show when both are enabled | `all` | `false` |
| `Search unit for 2FA` | Time unit for searching messages (minutes/hours/days) | `minutes` | `true` |
| `Search amount for 2FA` | Number of units to look back for codes | `5` | `true` |
| `Ignore already read messages` | Skip messages that have been read | `false` | `false` |

### Using Gmail (Optional)

The extension supports Gmail as an alternative to Apple Mail. The main advantage of using Gmail is that it doesn't require the Apple Mail app to be running in the background.

To use Gmail:

1. In the extension preferences, change the "Email Source" to "Gmail"
2. Set up a Gmail OAuth Client ID (see below)
3. Enter your OAuth Client ID in the extension preferences

#### How to get a Gmail OAuth Client ID

For now you need to create your own OAuth Client ID to be able to use this extension.
Getting a production enabled OAuth Client ID is complicated but is planned in the future.

⚠️ The following description can change over time. Make sure to obtain an `OAuth key` and not an `API key`!
You can search on Google or YouTube to get a better process description like e.g. [this blog post](https://stateful.com/blog/gmail-api-node-tutorial).

- Goto [Google Developers Console](https://console.developers.google.com)

  Make sure that you logged in with the Google Account which will be associated with your new OAuth key

- Create a project and named it e.g. `Raycast`

  This step take some seconds until the project is created.

- Enable the `Gmail API`

  1. Click [here](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
  2. Press the `Enable` button

- Enable OAuth

  1. Click [here](https://console.cloud.google.com/apis/dashboard)
  2. Click on `OAuth consent screen` on the left side
  3. Check `External` and click `Create`
  4. In `App Name` type `Raycast`
  5. In `User Support Mail` type your own email address
  6. In `Developer Contact Info` type your own email address
  7. Press `Save and Continue`
  8. Goto to `Test Users` and add the email address you wanna manage via Raycast
  9. Click on `Credentials` on the left side
  10. Click on the `Create Credentials` on the top (blue text)
  11. Press `OAuth client ID`
  12. In `Application Type` choose `iOS`
  13. In `Name` type `Raycast`
  14. In `Bundle ID` type `com.raycast`
  15. Press `Create`
  16. Now copy and paste the shown Client ID into the Preferences of this extension

