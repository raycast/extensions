# Kimai

This [Raycast](https://raycast.com) extension lets you quickly add new time log to [Kimai](https://www.kimai.org) and view amount of hours logged today in menu bar.

## Features

- Create new time log
- View amount of hours logged today in menu bar

## Setup

To connect the extension to your Kimai instance you need to add the following settings. There are 2 way to authorize your extension `API Token` or `Email & API Password`. `API Token` is recommended and both ways are not needed.

- **Request protocol:** Protocol to be used to make API requests. If you are using local (self hosted) Kimai, set it to 'http', otherwise keep it as 'https'.
- **Kimai Domain:** The domain of your Kimai instance like `your-organization.kimai.cloud`.
- **API Token:** Recommended for use in extension. You can find it in your `API Access` settings.
- **Email:** Email you use to login into Kimai
- **API Password:** Password different from password you use to login into Kimai. You need to create it in your `API Access` settings.
- **Default time log duration (in minutes):** Duration that will be used to prepopulate duration field when adding new time log

You can find your settings by going to `https://{your-organization}.kimai.cloud/en/profile/{your-email}/api-token` or

1. Open Kimai dashboard
2. Click on your username
3. Open `API Access`
4. Click on `+ Create` to create new token
