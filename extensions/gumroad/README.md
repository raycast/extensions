# Gumroad Sales

View your sales and products from [Gumroad](https://gumroad.com/).

## Connect your Gumroad account

The extension uses **OAuth** to allow you to securely log in:

1. `Run` any command

2. `Click` to **Sign in with Gumroad** when prompted

3. `Log In` (if not already) and `Allow` the application access (at the moment we only use "read-only" permissions)

4. `Enjoy` the extension!

## (OPTIONAL) Obtaining an Access Token

Instead of logging in via Gumroad you might prefer to use an access token. To do so, follow these steps:

1. Go to [Gumroad](https://gumroad.com) and log in to your account.

2. In the left sidebar, click "Settings" and then click on "Advanced". The following link can be used as a shortcut: https://app.gumroad.com/settings/advanced

4. In the "Applications" section you will need to create a new application. To do this you will need to provide a name and a redirect URI, which can be any valid URL, for example `https://localhost/`.

5. Once the app is created, click "Generate Access Token", copy the generated token and paste it into the corresponding field in the extension settings.
