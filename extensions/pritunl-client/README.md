# Pritunl Client

Connect, monitor and manage your Pritunl VPN profiles without leaving Raycast.

## Features

- **One-key connect.** Press ↵ to connect or disconnect a profile, or to cancel one
  that's still coming up. SSO profiles open the sign-in page in your browser.
- **Live network monitor.** Download and upload speed in Mbps, a chart of the last
  minute or 5 minutes, and the details the Pritunl app shows: user, organization,
  addresses, protocol, interface and time online.
- **Readable logs.** Grouped by connection attempt, with errors, warnings and
  connection changes marked, and route and DNS changes folded into one line.
- **Add and remove profiles.** Import from a profile link or a `.tar`, `.zip`, `.ovpn`
  or `.conf` file, and remove profiles after confirming.
- **Menu bar status.** See whether you're connected at a glance, and connect in one
  click.

## Requirements

- The [Pritunl client](https://client.pritunl.com) for macOS. The extension drives
  the `pritunl-client` command line tool that comes with it.
- If Pritunl isn't installed in `/Applications`, set the **pritunl-client Path**
  preference to `<Pritunl.app>/Contents/Resources/pritunl-client`.

## Commands

### Manage VPN Connections

Lists your profiles, with the ones that are connected first. The network monitor
for the selected profile sits on the right.

| Action                                     | Shortcut |
| ------------------------------------------ | -------- |
| Connect, disconnect or cancel              | ↵        |
| Hide or show the network monitor           | ⌘ D      |
| Switch between 1 and 5 minutes             | ⌘ T      |
| View logs                                  | ⌘ L      |
| Copy client IP                             | ⌘ ⇧ C    |
| Reload                                     | ⌘ R      |
| Add profile                                | ⌘ N      |
| Remove profile                             | ⌃ X      |
| Turn autostart on or off (system profiles) | From ⌘ K |

### View Logs

Opens from Manage VPN Connections. Use the dropdown next to the search bar to show
only errors, warnings and connection changes.

| Action                            | Shortcut |
| --------------------------------- | -------- |
| Copy the selected line            | ↵        |
| Copy the whole connection attempt | ⌘ ⇧ C    |
| Copy all logs                     | ⌘ ⌥ C    |
| Hide or show details              | ⌘ D      |
| Reload                            | ⌘ R      |

### VPN Status

Puts a lock in the menu bar, closed while you're connected. Click a profile to
connect or disconnect it.

## Adding profiles

Press ⌘N in Manage VPN Connections and choose where to import from:

- **Profile Link**: the `pritunl://` link from your Pritunl user profile page.
- **Profile File**: a `.tar`, `.zip`, `.ovpn` or `.conf` file.

If you've just copied a profile link, or have a profile file selected in Finder,
the form starts with it. A link or archive can add one profile per server.
Profiles are added as user profiles, like the Pritunl app does.

## How the network monitor works

- Speed is read once a second from macOS's byte counters for the tunnel interface
  (`netstat -ibn`). No admin rights are needed.
- The interface is found by matching the profile's client IP. If no interface, or
  more than one, has that IP, the monitor says so instead of guessing.
- Only traffic through the tunnel counts. With split tunneling, anything routed
  outside the VPN isn't included.
- Every connected profile is sampled while the command is open, so switching
  between profiles keeps each chart. History stays in memory and starts over when
  you reopen the command, reconnect, or wake your Mac.

## Privacy

- Everything runs on your Mac. Nothing is sent anywhere.
- Profile links work like a password. They're passed to `pritunl-client add`,
  never stored or logged, and hidden from error messages.
- Profile files aren't opened, except a `.zip`, since `pritunl-client` can't read
  one. It's unpacked to a private temporary folder, which is deleted right after
  the import.
- User, organization and protocol come from the profile's file in
  `~/Library/Application Support/pritunl/profiles`. That file also holds sync
  secrets, so only those three fields are read. System profiles are stored
  elsewhere and show without them.

## Troubleshooting

- **"Pritunl isn't installed"**: install the Pritunl client, or set the
  **pritunl-client Path** preference.
- **No sign-in page opens for an SSO profile**: while the Pritunl app is open, the
  extension leaves opening the page to the app. Use **Open Sign-In Page** on the
  "Connecting" toast to open it yourself.
- **"Traffic monitoring unavailable"**: the message says why, for example when
  another interface shares the client IP.
- **Connecting times out**: open **View Logs** and filter to errors and warnings.

## Development

```sh
npm install
npm run dev       # open the extension in Raycast with live reload
npm run lint      # check with Raycast's linter, ESLint and Prettier
npm run fix-lint  # fix what can be fixed automatically
npm run build     # production build
```
