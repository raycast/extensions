# Save vCards

Save a contact from highlighted text, a screenshot or a business-card photo straight to Apple Contacts, which syncs it to your iPhone through iCloud or Exchange.

Everything runs on your Mac. Text recognition and field detection use Apple's built-in Vision, Data Detector and Natural Language frameworks. No AI service, no network requests, no account.

## Commands

- **Save vCard from Selection**: highlight an email signature, a website imprint or any text with contact details and run the command. With nothing highlighted, it reads the clipboard.
- **Save vCard from Screenshot**: drag a box around a business card, a signature or a LinkedIn profile. Press Esc to cancel.
- **Save vCard from Clipboard**: reads copied text, or a copied image. Take a photo of a business card on your iPhone, copy it, and it is on your Mac's clipboard through Universal Clipboard.

Every command shows what it captured next to the contact it found. Press ↵ to save it, or ⌘E to edit it first.

| Shortcut | In the results                                                                                                 | In the edit form                     |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| ↵ / ⌘↵   | Save to Contacts (↵)                                                                                           | Save to Contacts (⌘↵)                |
| ⌘E       | Edit before saving                                                                                             |                                      |
| ⌘O       | Save and open it in Contacts                                                                                   | Save and open it in Contacts         |
| ⌘⇧↵      | Add the new details to the existing contact and open it (shown when the email or phone is already in Contacts) | Same; without a match, Save and Open |
| ⌘S       | Export the contact as a vCard (.vcf) file to Downloads                                                         | Same                                 |
| ⌘⇧C      | Copy the contact as vCard text                                                                                 | Same                                 |
| ⌘N       |                                                                                                                | Add a phone number                   |
| ⌘R       |                                                                                                                | Read the captured text again         |

The edit form also has a **Card Photo** field: pick a photo or scan of a business card and its text fills the fields.

## Permissions

macOS asks for two permissions, both granted to Raycast:

- **Contacts**: asked the first time a command shows a contact (to list your accounts and spot duplicates). If you declined, turn on Raycast under System Settings → Privacy & Security → Contacts.
- **Screen Recording**: needed for Save vCard from Screenshot only. Turn on Raycast under System Settings → Privacy & Security → Screen Recording, then **quit and reopen Raycast**. macOS applies this permission only after a restart.

## Preferences

- **Your Country**: phone numbers written without a country code (0664 …) are saved with yours (+43 664 …), so your iPhone recognizes incoming calls. Off by default: numbers are saved as written until you pick a country.
- **Debug Logging**: the log at `~/Library/Logs/SaveVCards.log` always records steps, timings and errors. Turn this on to also include names, emails and account names while troubleshooting. ⌘⇧L opens the log.

## What it recognizes

Names with academic titles (Mag., Dr., DI, Ing.) and post-nominals (MBA, MSc), job titles, companies with legal forms (GmbH, AG, OG, e.U., Ltd, Inc.), work, mobile and fax numbers, email addresses, websites, LinkedIn URLs and postal addresses. In a long email or thread it uses the newest sender's signature and ignores quoted headers.

## Privacy

Screenshots and card photos are kept in the extension's private support folder so the results can show them, and are deleted after a day, the next time you use the extension (at most the five newest are kept). Nothing leaves your Mac.

Notes: Apple lets apps write a contact's note only with a special entitlement. If the note cannot be saved, the contact is still saved and the confirmation says "note not saved".
