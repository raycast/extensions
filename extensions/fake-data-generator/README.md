# Fake Data Generator

Raycast extension that generates **fake but checksum-valid** test data. Open a command, pick a row, press **Enter** — it's on your clipboard.

| Command | What you get |
| --- | --- |
| Generate IBAN | 50 European countries. ISO 13616 mod-97 **plus national check digits** (BE, NL elfproef, FR clé RIB, ES, IT CIN, PT, PL, CZ/SK, HU, HR, EE, FI, NO, IS, …). Real bank codes + matching BIC for the big banks. |
| Generate VAT Number | All 27 EU countries in VIES format, plus GB, XI (Northern Ireland), CHE (Switzerland) and NO MVA. |
| Generate Tax ID | US EIN (valid IRS prefixes), Australian ABN / ACN / TFN, New Zealand IRD / GST number, NZBN. |
| Generate Financial Data | BIC/SWIFT (real public bank BICs + synthetic test BIC), Luhn-valid Visa / Mastercard / Amex / Discover / JCB with expiry + CVC, Stripe test-mode cards, ABA routing numbers, UK sort code + account, AU BSB + account. |
| Generate Phone Number | Mobile or landline per country (35 countries). Uses regulator-reserved **fictional ranges** where they exist. |
| Generate Person | Name, email, username, mobile, birthdate and address for 29 country profiles. |
| Generate Company | Company name with the right legal form (BV, GmbH, SAS, Ltd, LLC, Pty Ltd, …), VAT, registration number (KBO, KvK, HRB, SIREN/SIRET, ABN/ACN, NZBN, EIN…), IBAN + BIC, phone, email, website, address. |
| Generate Email | 11 email patterns (plus addressing, unique timestamp, role addresses) on reserved domains. |

## Shortcuts

| Key | Action |
| --- | --- |
| `↵` | Copy (format from preferences) and close |
| `⌘↵` | Paste straight into the active app |
| `⌘⇧C` | Copy the other format (compact ↔ formatted) / Copy All as Text |
| `⌘1` … `⌘9` | Copy variants (BBAN, BIC, without country prefix, national phone format, …) |
| `⌘R` / `⌘⇧R` | Regenerate one / all |
| `⌘⇧B` | Copy 10 fresh values, one per line |
| `⌘⇧J` | Copy person/company as JSON |
| `⌘I` | Toggle detail panel (breakdown + validation algorithm) |

Rows you use often float to the top (frecency).

### When do values change?

- **IBAN, VAT, Tax ID, Financial, Phone** — every copy/paste rolls a new value for that row, so the next copy is always fresh (even if Raycast restores the view instead of popping to root). Copying a variant (`⌘1`…`⌘9`, e.g. the BIC) keeps the current value so related parts still match.
- **Person, Company, Email** — a completely new record after every copy. Need several fields of the same person/company? Use `⌘⇧C` (all fields as text) or `⌘⇧J` (JSON).

## Preferences

- **Copy Format** — compact (`BE71096123456769`, default) or formatted (`BE71 0961 2345 6769`).
- **Phone Numbers** — prefer fictional ranges (default) or always pass libphonenumber validation.
- **Email Domain** — default `example.com`. Must be a valid domain; anything else falls back to `example.com`.

## Safety notes

- Emails use `example.com/.org/.net` and `.test` (RFC 2606 reserved), so mail to them is never delivered. If you set the **Email Domain** preference to a real domain, generated addresses are tagged `deliverable` and the safety text says so; an invalid value falls back to `example.com` with a warning.
- Phone numbers come from official fictional/drama ranges where they exist: US/Canada `555-01XX` (NANPA), UK (Ofcom), Ireland (ComReg), Australia (ACMA), France (ARCEP), Germany (BNetzA), Sweden (PTS), Norway (Nkom). UK `07700 900XXX` and French `06 39 98` mobiles are reserved but **fail** libphonenumber validation; switch the preference to "always pass validation" if your form rejects them. Countries without a reserved range get a random number in a valid range, tagged `random` — it may belong to someone, so don't let a staging system call or text it.
- IBANs, VAT numbers and tax IDs are random and pass checksum validation; they may by chance coincide with a real one. Use them for testing only.
- Random cards are Luhn-valid but will be declined by real processors; use the Stripe test cards for Stripe test mode.

## Verification

Generators were checked against independent validators: 5 000 samples per country/type through
[python-stdnum](https://arthurdejong.org/python-stdnum/) (IBAN incl. national BBAN checks, every VAT number, EIN, ABN, ACN, TFN, IRD, ABA, Luhn, BIC) and
[ibantools](https://github.com/Simplify/ibantools) (IBAN + BBAN national checks) — 0 failures. Phone numbers were checked with libphonenumber-js (max metadata).

## Development

```bash
npm install
npm run dev     # loads the extension into Raycast with hot reload
npm run build
npm run lint
```
