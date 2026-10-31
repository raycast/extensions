# BrewPage Publisher

Publish an explicitly selected HTML or Markdown file, or paste a report, and receive a reader link you can copy or open. Choose Public or Unlisted and password protection on every publication. The final confirmation shows those choices before any network request.

## Usage

1. Run **Publish Report**.
2. Paste HTML/Markdown or select one `.html`, `.htm`, `.md`, or `.markdown` file (UTF-8, up to 2 MiB).
3. Choose visibility and reader access; enter a password when required. Unsupported header characters and leading/trailing whitespace are rejected before confirmation; supported Latin-1 characters are preserved.
4. Review and confirm publication, then copy or open the reader link.

Public content is discoverable in the gallery and search. Unlisted content is available to anyone with its link. Password protection restricts reading; password-protected publications are not listed. New links request 15 days; existing links retain their original expiry. Do not upload secrets or personal information you do not intend to share. HTML may reference external resources that readers' browsers request.

Only the chosen file or pasted content is sent directly over HTTPS to `brewpage.app`. This extension never scans your workspace or reads clipboard history. Hidden files, credential/secret filenames, symlinks and other file formats are refused. Reader passwords are sent only in an HTTPS header, never a link. No analytics are added by this client.

Owner tokens and private management links are stored only in Raycast's encrypted, extension-scoped LocalStorage. They are not copied, shown in reader links, logged or written to project files. Keep this extension's storage to retain these capabilities; uninstalling or clearing storage can lose them. Reader passwords and report content are not saved by this extension. Raycast storage is documented at https://developers.raycast.com/api-reference/storage.

If owner storage fails after publishing, the reader link stays available with a warning. Keep the command open and choose **Retry Saving Owner Access** to retry only the private storage write. Pending credentials remain in memory until saved or the command closes; they are never written to a plaintext fallback, and retrying storage does not upload again.

The MIT license covers this native client. BrewPage is a separately hosted service; this client does not make the hosting backend open source or guarantee permanent storage. Service policies: [Privacy](https://brewpage.app/privacy) and [Terms](https://brewpage.app/terms).

## Development

Use Node.js 24.19.0 and `npm ci`. Run `npm test`, `npm run typecheck`, `npm run build`, and `npm run lint`. Tests use a real HTTP server bound to `127.0.0.1`; no test writes to BrewPage. The publisher takes an explicit transport; production constructs it only with Node `fetch`, and fixture origins are restricted to loopback HTTP.

The `maksim_kochetkov` author handle passes the official SDK lookup and full lint. Native Raycast execution, rendered UI, storage behavior and screenshots remain untested; the Store review determines admission. Local protocol and storage-retry fixtures do not establish native runtime acceptance.
