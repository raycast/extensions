# Switch Game Play History

Browse your Nintendo Switch gameplay history. Including information such as first played time, last played time, and total playtime for each game.

## How to get session token?

The session token has a validity period of up to 2 years. This means that theoretically, users only need to obtain the token once, and it will remain valid for the duration of the 2-year period.

1. Run the "get session token" command and press ⌘ + ↩ to open the link.

2. Login to your nintendo account.

3. Right-click on the "Select this account" red button to copy the link address.![pic](assets/copy_link.png)

4. Paste the url into the input in the step 2, and the session token will be automatically fetched.

## How to sync data to Notion?

1. Follow the instructions on [Create a notion integration](https://developers.notion.com/docs/create-a-notion-integration) to create an integration.
2. Create a new database for storing play history data.
3. Get your integration's `Internal Integration Token` and `Database ID`.
4. paste them into the preferences.
5. Check the box for Sync to Notion, and your play history data will be automatically synced to Notion next time you fetch it.

Note: The syncing process may take a long time due to the Notion API. To ensure accurate syncing, I recommend using data through [create a relation](https://www.notion.so/help/relations-and-rollups#create-a-relation) and use [rollup](https://www.notion.so/help/relations-and-rollups#rollups).

## Is my session token safe?

The session token is stored purely locally and is never sent to any remote servers or third parties. All network requests related to the session token are directly sent to the official Nintendo website.

## Disclaimer

The method for obtaining the session token used in this system is mainly based on the source code provided by https://github.com/ZekeSnider/NintendoSwitchRESTAPI. Although I have personally used this method and have not encountered any issues related to my Nintendo account, I cannot guarantee that it is completely safe and free from any risk.

Users should be aware that using any third-party tools to obtain the session token may violate the Nintendo user agreement and their account may be subject to termination or suspension. Therefore, users should use such tools at their own risk and understand the potential consequences.

I hereby declare that I shall not be held liable for any issues or damages resulting from the use of this method for obtaining the session token. The user assumes all responsibility and risk associated with using this method.

By proceeding to use this system and the method provided herein, you acknowledge and agree to this disclaimer.
