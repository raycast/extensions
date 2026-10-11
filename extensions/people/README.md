# People for Raycast

The extension searches the People app's local index. Open a result to
browse the contact inside Raycast, where every available field can be copied and email,
phone, website, and address fields have contextual actions. The action panel can also
open the stable `contactsplus://contact/<stable-id>` link in People. The
extension never accesses provider tokens or maintains a second contact database.

## Get People

The extension needs the People app installed on the same Mac. Download People from the [App Store](https://apps.apple.com/app/id6790219748) or read more at [supersimplecontacts.com](https://supersimplecontacts.com/). Launcher access is part of the People subscription.

Run **Open People** in Raycast to launch the app or bring its window forward. This
command works before you configure an access key. **Search People** starts the app
in the background when needed and waits for it to become ready. If a search fails,
use **Retry Search** from the action panel after checking your setup.

To have People ready as soon as you sign in to your Mac, enable **Settings →
General → Start at login** in People. If People shows an approval notice, use
**Open Login Items** to approve it in macOS System Settings. Search does not
require Start at login to be enabled.

## Development

In the app, open **Settings →
General → Launcher Access** and copy the Raycast key into this extension's **Raycast
Access Key** preference. The app exposes an authenticated, read-only API on
`127.0.0.1:47631`; the extension cannot access the contact database or provider
credentials directly.

```sh
npm install
npm run dev
```

Use **Search People** in Raycast. Press Return on a contact to see its
fields, then press Return or Command-C on a field to copy it. Run `npm run lint` and
`npm run build` before publishing. Run **Report a Bug** to open a pre-addressed support
email with a short troubleshooting template.
