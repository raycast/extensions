# Monzo

View your Monzo accounts, pots, and recent transactions.

### Setup instructions

Due to limitations with Monzo's API, setup has a few steps to it. They aren't complicated, just follow along carefully and you'll be up and running in no time.

If you're comfortable with OAuth API setup, feel free to skip through these steps – all we need is to create a new OAuth client on [Monzo's developer portal][monzo-dev], enter the credentials for it in the extension preferences, and then sign in to the extension with Monzo's OAuth process.

#### Step by step

1. Go to the [Monzo developer portal][monzo-dev] and start signing in.
2. Enter your email address, and open the link in the login email you receive from Monzo.
3. _Important!_ Open Monzo on your phone, and approve access for the developer portal.
4. Head to the [Clients][monzo-clients] page on the developer portal and start creating a new client.
5. Enter the following details

| Field           | Details to enter                                                  |
| --------------- | ----------------------------------------------------------------- |
| Name            | `Monzo for Raycast`                                               |
| Logo URL        | Leave blank                                                       |
| Redirect URLs   | `https://monzo.oauth-proxy.raycast.com/redirect`                  |
| Description     | `Access to Monzo account, balance, and transactions in Raycast..` |
| Confidentiality | `Confidential`                                                    |

6. Click submit, and open your new client from the list.
7. Copy the **Client ID** into the extension preferences under **OAuth Client ID**. Make sure not to include anything else. It should start with `oauth2client_`.
8. Copy the **Client secret** into the extension preferences under **OAuth Client Secret**. Make sure not to include anything else, and to get the full secret. It should start with `mnzconf.` and may end with one or more `=` that must be included.
9. You're done with the hard part! Start using the extension in Raycast.
10. The first time you use the extension you'll need to sign in. This uses the OAuth Client that you've just created, and authenticates your account for access. Follow the steps to log in, and remember to open the Monzo app to approve access once you've done so, you'll only need to do this once.

#### Security

This process is safe and secure.

- No one can transfer money out of your account with anything this extension does, Monzo do not allow this in any way.
- All communication between the extension, Monzo, and the authentication server, is encrypted at all times.
- Your data is not stored longer than necessary to support the use of the extension, and is not analysed in any way.

During sign-in, authentication is proxied through a Raycast server in order to provide compatability with Monzo's authentication. This is only temporary, during login, and no banking data is sent to Raycast servers.

While we, the plugin authors and Raycast, have taken great care to ensure the security of this whole process, and are users of the extension ourselves, we accept no responsibility for any issues that may occur while using it.

[monzo-dev]: https://developers.monzo.com/
[monzo-clients]: https://developers.monzo.com/apps/home
[raycast-oauth]: https://developers.raycast.com/api-reference/oauth
