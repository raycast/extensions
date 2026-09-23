# Set up LDAP Contacts

This extension talks to your LDAP / Active Directory server directly. You need the server address, an account to bind with, and a search base — the place in the directory tree where your users live.

## 1. Collect the connection details

Ask your directory administrator (or peek at an existing address-book tool) for:

- **Host and port** — e.g. `dc01.company.ads`. Ports: `389` for LDAP/StartTLS, `636` for LDAPS.
- **Bind account** — the account the extension authenticates as. Both forms work: a full distinguished name like `CN=svc-raycast,OU=Service Accounts,DC=company,DC=ads` or a user principal name like `ldap@company.ads`. A dedicated read-only account is ideal — each search opens a connection, runs one read-only query, and disconnects; the extension never modifies directory data.
- **Search base** — the distinguished name of the container holding the people you want to find, e.g. `OU=Frankfurt,DC=Company,DC=Ads`. Keep it as narrow as possible: searches cover everything below it and are capped at 50 results.

## 2. Fill in the extension preferences

| Extension preference | What to enter |
| --- | --- |
| **LDAP Host** | Hostname of your directory server |
| **Security** | See below |
| **LDAP Port** | Optional — leave empty to use `389`, or `636` for LDAPS |
| **Username** | The bind DN or user principal name |
| **Password** | Password of the bind account |
| **Search Base** | The DN to search within |
| **Verify TLS Certificate** | Leave on whenever possible |
| **TLS CA Certificate** | Path to a PEM file with your internal CA |
| **Phone Prefix** | Optional — see below |

- **Security**: **StartTLS** (the default) connects on port 389 and upgrades to TLS — the usual choice for Active Directory. **LDAPS** encrypts from the start on port 636. **Plain** sends everything unencrypted and is therefore only accepted for localhost addresses.
- **Verify TLS Certificate**: while on, the server certificate must be trusted by your Mac. For a server signed by an internal CA, either the CA is already in your system keychain, or you point **TLS CA Certificate** to the CA's PEM file, e.g. `/Users/you/company-ca.pem`. Turn verification off only for test servers you control.
- **Phone Prefix**: if your directory stores numbers with an internal prefix (e.g. `9701234`), set `970` and results show `1234`. The prefix is stripped only when the number actually starts with it.

## How it searches

Type at least 2 characters; the query runs once you stop typing. It matches substrings across display name, first/last name, username, email, department, job title, and phone number. Only people with a phone number are returned, and computer accounts are skipped. On a result you can copy "Name (Phone)", copy just the number (⇧⌘C), or paste the number into the frontmost app (⌘V).

## Troubleshooting

- **"Plain LDAP is not allowed for remote servers"** — **Security** is set to Plain but the host is not localhost. Switch to StartTLS or LDAPS; the extension refuses to send the bind password unencrypted.
- **Connection refused / timeout** — wrong **LDAP Host** or port, or a firewall in between. Ports `389` and `636` must be reachable from your Mac.
- **Certificate errors (self-signed, unable to verify)** — the server certificate isn't trusted. Provide the signing CA via **TLS CA Certificate** (or install it in your system keychain); only disable **Verify TLS Certificate** for throwaway setups.
- **"StartTLS handshake timed out"** — the server acknowledged the TLS upgrade but never completed it. A firewall or middlebox is usually dropping packets mid-handshake; make sure port 389 is fully reachable, not just accepting connections.
- **"Unable to read TLS CA certificate file"** — the path in **TLS CA Certificate** doesn't exist or isn't readable. It must be a local file path on your Mac.
- **Invalid credentials** — check the password and the username format. Active Directory accepts bind DN and UPN; OpenLDAP and friends usually want the full bind DN.
- **No results** — verify the **Search Base** actually contains the users and that the bind account may read it. Also note: only entries with a `telephoneNumber` show up, and your term must match at least partially.
- When a search fails, the error toast offers **Copy Error Details** (⌘C) with the full message and connection target — handy when asking your admin.
