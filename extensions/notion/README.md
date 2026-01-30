<p align="center">
    <img src="./assets/notion-logo.png" width="150" height="150" />
</p>

# Notion

The fastest way to search and create [Notion](https://notion.com) pages.

## Using internal integration

If you are not logging in through OAuth, you can still use the extension with an internal integration secret. Follow the steps below to do so:

1. Create a new integration over [here](https://www.notion.so/my-integrations)
2. Copy the `Internal Integration Secret` (under `Secrets`)
3. Manually give the integration access to the specific pages or databases by [adding connections to them](https://www.notion.so/help/add-and-manage-connections-with-the-api#add-connections-to-pages)


## Using multiple accounts

You can connect two Notion accounts when using OAuth:

1. In Raycast settings, set `Authentication Type` to `OAuth (Recommended)`.
2. Fill both `Account 1 Label` and `Account 2 Label` (for example: Work, Personal).
3. Use the account selector in Create Database Page, Quick Capture, and Add Text to Page to switch accounts.
4. Search Notion will query both accounts and show the account label on the right.

Note: Internal Integration Secret mode is single-account only.

When using `@notion`, you can specify the account with the label (for example: “in Work”) and it will route to that account. If the account is ambiguous and multiple accounts are configured, it will ask which account to use.

## I can't find the Notion page or database from Raycast

If you have connected your Notion account to Raycast, you need to grant the Raycast Extension access to new root pages.

To do so, open `Settings & Members`. Then, in the `My Connections` section, click the three dots next to the Raycast Extension, and hover over the "Access Selected Pages" menu item. You will be able to grant access to new pages.

![Raycast extension access](./media/raycast-extension-access.png)

If you are unable to do so or if you used an internal integration secret, you can follow the steps on the page: [Add connections to pages](https://www.notion.so/help/add-and-manage-connections-with-the-api#add-connections-to-pages).
