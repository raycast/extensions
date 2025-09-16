<p align="center">
  <img src="assets/icon.png" height="128">
  <h1 align="center">EARLY</h1>
</p>

A
[Raycast](https://raycast.com/)
extension that lets you control
the [EARLY](https://early.app/)
tracker.

![Screencast example](https://user-images.githubusercontent.com/12697803/149980015-38d5340a-2bed-43cf-b642-17b4894c00a3.mp4)

### Configure `apiToken`

Please provide **apiToken** in the extension preferences.
To create a new client id and secret, do the following:
1. Go to your [account](https://product.early.app/#/settings/account).
2. Generate API credentials.
   EARLY will grant you API Key and API Secret.
   Save them both.
3. Create API Token with `curl`:
   ```sh
   curl -X POST \
     -H 'Content-Type: application-json' \
     -d '{ "apiKey": "{{API_KEY}}", "apiSecret": "{{API_SECRET}}" }' \
     https://api.early.app/api/v3/developer/sign-in
   ```
   Place your keys instead of `{{API_KEY}}` and `{{API_SECRET}}`.
4. In response, you will get the API Token.
   The token now can be used in the extension.

#### Is something missing? Let us know and [create an issue](https://github.com/raycast/extensions/issues/new/choose)!
