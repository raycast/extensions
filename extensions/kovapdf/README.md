# KovaPDF for Raycast

Work on PDF files from Raycast with KovaPDF (https://www.kovapdf.com):

| Command | What it does |
|---|---|
| Compress PDF | Makes the PDFs selected in Finder smaller. The smaller copy is saved next to each original, as `name-compressed.pdf`. |
| Merge PDFs | Joins the PDFs selected in Finder into one, in name order, saved next to the first as `name-merged.pdf`. |
| Verify PDF Signature | Checks every digital signature in the PDF selected in Finder and shows the report. |
| Bijoy to Unicode | Converts the selected Bijoy (SutonnyMJ) text to Unicode Bangla, then pastes it in place or copies it. |

Every result says it was done with KovaPDF, with a link to https://www.kovapdf.com.
Nothing is ever overwritten: an existing file gets a new name.

## Set up

1. Make an API key in your KovaPDF dashboard (Developer API). A test key
   (`kova_test_`) is free to make; a live key (`kova_live_`) needs API access
   on your account.
2. Open the extension's preferences in Raycast and paste the key into
   **API Key**. Raycast keeps it as a password; the extension never writes it
   anywhere else.
3. Optional: choose the compression level, and whether Bijoy to Unicode pastes
   or copies the result.

## Limits

Your account's own limits apply, exactly as on the website. Files are deleted
from KovaPDF within an hour. The extension is gentle with KovaPDF: it waits
at least 2 seconds between checks on a job, honours every "try again later"
answer, and never retries a refusal in a loop.

If KovaPDF has paused connections from Raycast, or paused a tool for apps, the
extension says so in a toast with a link to the website, and changes nothing.

## How it works

The commands use the official KovaPDF SDK (`@kovapdf/sdk`). Each call says it
comes from Raycast (`X-KovaPDF-Client: raycast`, `User-Agent: kovapdf-raycast/<version>`).
The logic lives in `src/lib/logic.ts` and is tested without Raycast.

## Develop

```sh
npm install
npm test          # the logic tests (no Raycast needed)
npm run lint      # ray lint: manifest, icon, ESLint, Prettier
npm run build     # ray build
npm run dev       # ray develop, on a Mac with Raycast
```

`ray build` and the ESLint and Prettier parts of `ray lint` work offline.
`ray lint` also checks the `author` field against the Raycast Store, which
needs the network and a real Raycast username.

## Before submitting to the Raycast Store (owner)

- Publish `@kovapdf/sdk` to npm first, then change the dependency
  `"@kovapdf/sdk": "file:../sdk-js"` to the published version (for example
  `"0.1.0"`) and run `npm install` again.
- Set `author` in package.json to the KovaPDF Raycast account's username.
- The icon in `assets/icon.png` is the KovaPDF logo (512 by 512). It is not
  open licensed: see LICENSE.
- Add screenshots in `metadata/` if you want them in the Store.
- Submit with `npx ray publish` (it opens a pull request to the Raycast
  extensions repository).

## Licence

MIT for the code. The KovaPDF name, logo and icon are not covered: see LICENSE.
