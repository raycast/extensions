# Notify Africa Bulk SMS

Send SMS from Raycast through Notify Africa.

## Setup

1. Create a Notify Africa API key with Bulk SMS access.
2. Install the extension.
3. Enter the API key when Raycast opens the extension preferences.

The extension always calls `https://api.notify.africa/api/v1`; users cannot change the API origin.

## Commands

### Send Personalized SMS

Enter one recipient and body per line:

```text
255712345678 | Your verification code is 482901
255713456789 | Your verification code is 102938
```

Each row is sent separately after confirmation. Use the approved Sender ID UUID,
for example `6addad95-f6c8-XXXX-XXXX-c8ef52067ea6`.

### Send Bulk SMS

Enter Tanzania recipients separated by commas or new lines, then enter one shared body. The extension sends one bulk request after confirmation.

### Send SMS from File

Choose one UTF-8 `.csv` or `.xlsx` file, provide the Sender ID UUID and a shared message, then preview the parsed recipients before sending. The extension reads CSV files and the first XLSX worksheet locally; it accepts a `phone`, `phone_number`, `phone number`, `phoneNumber`, `numbers`, `recipient`, or `msisdn` column (case-insensitive), or a headerless first column of Tanzania numbers. Numbers may use `071...`, `7...`, `255...`, or `+255...` form.

The source file and its parsed recipients are never uploaded or saved by the extension.

## Privacy And Safety

- The API key is stored as a Raycast password preference.
- Recipient lists, SMS bodies, and responses are not saved by the extension.
- The extension never retries automatically, preventing an uncertain network result from sending duplicate SMS.

## Development

```sh
npm install
npm run dev
```

Before a public Store submission, set `author` in `package.json` to the owning Raycast Store handle, then run `npm run lint`, `npm run test`, and `npm run build`.
