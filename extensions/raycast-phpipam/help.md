# Set up phpIPAM

This extension talks to your phpIPAM instance through its API. You need an API application and, depending on its security mode, a local user account.

## 1. Create the API application

1. Sign in to phpIPAM as an administrator and go to **Administration → API**.
2. Create a new application and set:
   - **App id**: for example `raycast` (case-sensitive — you enter it as "API App ID" in the extension preferences).
   - **App permissions**: **Read** is enough. The extension never modifies data — every request is a read-only `GET`, except the login request that fetches the API token.
   - **App security**: see the table below.
3. If you picked an app-code mode, open the app again with the edit (pencil) icon to view the **App code** (you can **Regenerate** it there at any time). The **Documentation** link in that dialog opens phpIPAM's API reference.

## 2. Map "App security" to the extension preferences

| App security in phpIPAM | Extension preferences to fill in |
| --- | --- |
| **SSL with User token** or **User token** | **Username** and **Password** |
| **SSL with App code token** | **API App Code** — copy the **App code** from the app's edit dialog; username/password are ignored |
| **Encrypted** | Not supported — the extension does not implement phpIPAM's encrypted-request protocol |

- **phpIPAM URL**: the full base URL, e.g. `https://phpipam.example.com`. Use the final URL — if the server redirects (for example from `http://` to `https://`), the login fails because web servers drop the `Authorization` header on redirects.
- **Username**: must be a **local** phpIPAM user with API access. SAML users cannot authenticate against the API.
- **Ignore TLS errors**: only for internal instances with self-signed certificates that you trust. Leave off otherwise.

The extension logs in on first use, caches the API token and re-authenticates automatically when it expires.

## Troubleshooting

- **"phpIPAM received no credentials"** — the web server strips the `Authorization` header before it reaches PHP. Fix it server-side:
  - nginx with PHP-FPM: add `fastcgi_pass_header Authorization;` to the PHP location block.
  - Apache with PHP-FPM/CGI: add `CGIPassAuth On` to the virtual host (a `.htaccess` file works, too, when overrides are allowed).
  - Also check for `RequestHeader unset Authorization` in the web server configuration.
- **Authentication failed** — verify the App id (case-sensitive), the user's password, and that the app's **App permissions** allow API access for this user.
