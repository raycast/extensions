<div align="center">
  <img
    src="https://github.com/raycast/extensions/blob/main/extensions/gmail/assets/gmail.png?raw=true"
    width="50"
  />

  <h1>
    Gmail
  </h1>

Raycast extension to manage your Gmail inbox.

  <p>
    <a href="https://www.raycast.com/tonka3000/gmail">
      <img src="https://img.shields.io/badge/Raycast-store-red.svg"
        alt="Find this extension on the Raycast store"
      />
    </a>
    <a
      href="https://github.com/raycast/extensions/blob/master/LICENSE"
    >
      <img
        src="https://img.shields.io/badge/license-MIT-blue.svg"
        alt="raycast-extensions is released under the MIT license."
      />
    </a>
    <img
      src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg"
      alt="PRs welcome!"
    />
    <a href="https://twitter.com/intent/follow?screen_name=tonka_2000">
      <img
        src="https://img.shields.io/twitter/follow/tonka_2000.svg?label=Follow%20@tonka_2000"
        alt="Follow @tonka_2000"
      />
    </a>
  </p>
</div>

## Features

- Check mails
- Manage unread mails
- Manage Drafts
- Open specific mail on gmail.com

## How to get a Gmail OAuth Client ID

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

Now you should be able to manage your Gmail account with Raycast.
