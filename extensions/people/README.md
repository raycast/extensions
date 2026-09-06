# People for Raycast

The extension searches the People app's local index. Open a result to
browse the contact inside Raycast, where every available field can be copied and email,
phone, website, and address fields have contextual actions. The action panel can also
open the stable `contactsplus://contact/<stable-id>` link in People. The
extension never accesses provider tokens or maintains a second contact database.

## Get People

The extension needs the People app running on the same Mac. Download People from the [App Store](https://apps.apple.com/app/id6790219748) or read more at [supersimplecontacts.com](https://supersimplecontacts.com/). Launcher access is part of the People subscription.

## Development

People must be running on the same Mac. In the app, open **Settings →
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
