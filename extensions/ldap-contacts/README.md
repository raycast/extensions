# LDAP Contacts

Quickly look up colleagues in your company's LDAP / Active Directory directory straight from Raycast: type a name (or a phone number), get matches back with title, department, and phone number, and copy or paste the number without touching your mouse.

Built for the classic "someone's extension, fast" problem — the kind of thing you do twenty times a day and don't want a full address book client for.

## How it searches

The command binds to your directory server and runs a substring search (`*term*`) across these attributes:

`displayName`, `givenName`, `sn`, `sAMAccountName`, `mail`, `department`, `title`, `telephoneNumber`

A few details worth knowing:

- Only entries with a `telephoneNumber` are returned — this is a people/phone lookup, not a general directory browser.
- Computer objects are filtered out.
- Results show the `displayName` when available, falling back to given name and surname.
- Results are ranked: name matches first, then email, then phone number, then everything else. Within the same rank, alphabetical by name.
- Search triggers after a 300 ms debounce, needs at least 2 characters, and is capped at 50 results.
- Stale searches are canceled: starting a new query tears down the previous directory connection.

## Setup

Configure the extension in Raycast's extension settings:

| Preference             | Required | Description                                                                                                                                                                                       |
| ---------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LDAP Host              | yes      | Hostname of your LDAP/AD server                                                                                                                                                                   |
| Security               | no       | Connection security: `StartTLS`, `LDAPS`, or `Plain (ldap://)`. Defaults to StartTLS; Plain is only allowed for localhost hosts so bind credentials are never sent unencrypted to a remote server |
| LDAP Port              | no       | Leave empty to use the default for the selected security mode: `389`, or `636` for LDAPS                                                                                                          |
| Username               | yes      | Bind DN or user principal name, e.g. `ldap@company.ads`                                                                                                                                           |
| Password               | yes      | Password for the bind user                                                                                                                                                                        |
| Search Base            | yes      | Distinguished name to search within, e.g. `OU=Frankfurt,DC=Company,DC=Ads`                                                                                                                        |
| Verify TLS Certificate | no       | Validate the server certificate against the system trust store and CA file. On by default; only disable for self-signed setups without a CA                                                       |
| TLS CA Certificate     | no       | Path to a PEM file with the CA that signed your server certificate, for internal CAs                                                                                                              |
| Phone Prefix           | no       | Internal prefix stripped from numbers in results, e.g. `970` so `9701234` shows as `1234`                                                                                                         |

## Usage

Set a Raycast alias once (⌘K → Configure Command → Set Alias, e.g. `ldap` — aliases are per-user, extensions can't ship them). After that, typing the alias followed by a space opens the command straight away, with the cursor in its search field — type the name or number and results appear as you type.

Search, then act on a result:

- **Copy Name (Phone)** — puts `Jane Doe (1234)` on the clipboard, handy for tickets and chats.
- **Copy Phone Number** (⇧⌘C) — just the number.
- **Paste Phone Number** (⌘V) — pastes the number directly into whatever frontmost app.

## Development

```bash
npm install
npm run dev     # run in Raycast during development
npm run build   # production build
npm run lint
```

## License

[MIT](./LICENSE)
