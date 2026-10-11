# Connect Kody's Pouch

Kody's Pouch needs one credential URL from a Discovery Package in your Kody account.

1. For Skills, fork [Kent's skills Listing](https://kody.codes/@kentcdodds/skills), review it, and privately publish your copy with `kody.id` set to `skills`.
2. Fork the [Kody's Pouch Discovery Package](https://kody.codes/@cameronpak/raycast-kodys-pouch), review it, and publish your copy.
3. Open `https://kody.codes/@<username>/raycast-kodys-pouch/settings#webhooks` with your Kody username in the path.
4. Mint and copy the `pouch` webhook URL.
5. Enter your Kody username and paste the URL into **Pouch Webhook URL**. Keep **Discovery Package Kody ID** as `raycast-kodys-pouch` unless you changed it in your fork.

The webhook URL is a credential. Store it only in this password preference. Do not paste it into chat or commit it.

If you do not publish a `skills` Package, the Pouch still shows Tools.
