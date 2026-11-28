# Redact PII

Mask personal data in any text before you paste it into an AI chat, a ticket or a log, then put the real values back into the reply. Detection runs on your Mac: your text is never sent anywhere. Apple silicon Macs use Core ML; Intel Macs use a slower WebAssembly build of the same model.

On-device AI by [Desert Ant Labs](https://desertant.com) 🐜

## Commands

| Command                   | What it does                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------- |
| **Redact Clipboard**      | Redacts the text on the clipboard and copies the result back.                         |
| **Redact Selected Text**  | Replaces the selected text in the frontmost app with a redacted version.              |
| **Redact Text**           | Shows what was found (with confidence) before you copy or paste the result.           |
| **Restore Clipboard**     | Puts the original values from the last redaction back into the text on the clipboard. |
| **Restore Selected Text** | Same as Restore Clipboard, for the selected text.                                     |
| **Forget Last Redaction** | Deletes the stored original values right away.                                        |

Every detection is replaced by a numbered placeholder:

```
Hi, I'm Sophie Bakker, mail sophie.bakker@example.com or call 06 12345678.
→ Hi, I'm [GIVEN_NAME_1] [SURNAME_1], mail [EMAIL_1] or call [PHONE_1].
```

Restore swaps the placeholders back, so an AI reply such as "Dear [GIVEN_NAME_1], …" becomes "Dear Sophie, …".

## What it detects

Names, street addresses, cities, postal codes, email addresses, phone numbers, credit cards, bank accounts and IBANs, routing numbers, IP addresses, URLs, passports, driver's licenses, tax numbers and other government IDs, in all official EU languages plus Norwegian and Icelandic. Card numbers, IBANs and national IDs are only masked when their checksum is valid.

The model finds roughly 9 out of 10 personal details (Desert Ant Labs reports 88.8% recall). Treat it as a strong first pass, not a guarantee that a text is clean, and check the result before you share anything sensitive. It can also occasionally mask an ordinary capitalized word, especially in code.

## Preferences

- **Organizations**: also redact company names (detected but left alone by default, since a company is not a person).

## Privacy

- **Your text stays on your Mac.** The model runs locally; no text, detections or results are sent anywhere.
- **Model download.** On first use the model is downloaded once from [Hugging Face](https://huggingface.co/desert-ant-labs/redact), verified by its SHA-256 hash and cached in the extension's support folder.
- **License check.** The Redact SDK registers its use with Desert Ant Labs, which is how their free tier (up to 100,000 monthly active devices) is counted. Once a month it sends two requests to `events.desertant.com` containing a random install ID, the app name (`raycast-redact-pii`), the model and SDK versions, and the platform (`server`). It never includes your text. The install ID and license are stored in macOS user defaults (Apple silicon) or in the extension's support folder (Intel).
- **Restore data.** To make Restore work, the placeholders and their original values from your most recent redaction are kept in Raycast's local storage on your Mac. They are deleted after one hour (checked every 10 minutes), when you redact something else, or when you run Forget Last Redaction.

## Credits

Detection uses the [Redact](https://desertant.com/models/redact/) model and SDK by [Desert Ant Labs](https://desertant.com), used under the [Desert Ant Labs Source-Available License](https://license.desertant.com/1.0). This extension's own code is MIT licensed.
