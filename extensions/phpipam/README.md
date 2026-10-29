# phpIPAM

Browse and search your [phpIPAM](https://phpipam.net) instance from Raycast: IP addresses, subnets, sections, VLANs and VRFs.

## Commands

| Command | Description |
| --- | --- |
| **Search IPAM** | Global search across addresses (IP, hostname, description, owner, MAC), subnets, VLANs and VRFs (type at least 3 characters) |
| **Browse Sections** | List sections and drill into their subnets (with usage statistics) |
| **Browse Subnets** | Flat, filterable list of all subnets across all sections |
| **First Free Address** | Pick a subnet and copy its first free IP address to the clipboard |

### Actions

- Addresses: copy IP / hostname / MAC, open in the phpIPAM web UI, jump to the containing subnet
- Subnets: open detail view (usage, description, VLAN, all addresses), copy CIDR, copy first free address, open in the web UI

### Read-only by design

The extension never modifies data in phpIPAM. Every data request is an HTTP `GET`; the only `POST` is the `/user/` token login that phpIPAM's API requires. "Copy First Free Address" uses the read-only `GET subnets/{id}/first_free/` endpoint — it computes the next free IP without allocating it (phpIPAM's allocating variant, `POST addresses/first_free/…`, is never called). For defense in depth, keep the API app's permissions set to **Read**; phpIPAM then rejects write attempts server-side regardless.

## Configuration

1. In phpIPAM, go to **Administration → API** and create a new application:
   - **App id**: for example `raycast`
   - **App permissions**: **Read** is enough (see "Read-only by design" above)
   - **App security**:
     - **SSL with User token** or **User token** — the extension authenticates with username/password and caches the returned token
     - **SSL with App code token** — copy the **App code** from the app's edit dialog into the preferences below; username/password are ignored
     - **Encrypted** is not supported
2. Enter the extension preferences in Raycast (see [help.md](./help.md) for a detailed setup guide):

| Preference | Description |
| --- | --- |
| phpIPAM URL | Base URL of the instance, e.g. `https://phpipam.example.com` |
| API App ID | The **App id** created above (exact, case-sensitive) |
| Username / Password | Local phpIPAM user permitted to use the API (not used for app-code apps) |
| API App Code | Only for apps with **SSL with App code token** security: the App code from the app's edit dialog |
| Ignore TLS errors | Optional: allow self-signed certificates |
| Allow unencrypted (HTTP) connections | Optional: allow plain `http://` instances (credentials are sent unencrypted — trusted internal networks only) |

The extension authenticates on first use, caches the API token and transparently re-authenticates when it expires. Note that the API requires a **local** phpIPAM user — SAML users cannot authenticate via the API.

## Development

```bash
npm install
npm run dev     # run in Raycast during development
npm run build   # production build
npm run lint
```

## License

[MIT](./LICENSE)
