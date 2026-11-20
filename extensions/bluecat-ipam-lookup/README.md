# BlueCat BAM Lookup

Look up IP addresses, networks, and DNS records in [BlueCat Address Manager](https://bluecatnetworks.com/address-manager/) directly from Raycast, and jump straight to the matching page in the Address Manager web UI.

## Features

- **IP address lookup** — enter an IPv4 or IPv6 address to see its name, state, MAC address, containing network, gateway, linked DNS records, and user-defined fields.
- **Network lookup** — enter a CIDR (e.g. `192.0.2.0/24`) to see the network's name, gateway, and user-defined fields. If no exact match exists, the containing networks are shown instead.
- **DNS lookup** — enter any other text (e.g. `host.example.com` or `host`) to find matching resource records with their type, value, and TTL.
- **Open in BlueCat** — press <kbd>Enter</kbd> on any result to open it in the Address Manager web UI.
- **Copy actions** — copy addresses, ranges, gateways, names, MAC addresses, record values, object IDs, and web UI URLs.

## Requirements

- BlueCat Address Manager / Integrity with the **RESTful v2 API** (`/api/v2`), available in Address Manager 9.5 and later.
- An Address Manager user with **API access** (user access type "API" or "GUI and API"). Read-only permissions are sufficient.
- The Address Manager server must present a TLS certificate trusted by macOS.

## Setup

When you first run the command, Raycast asks for the following preferences:

| Preference | Description |
| --- | --- |
| Address Manager URL | Base URL of your Address Manager server, e.g. `https://bam.example.com`. Do not include `/api/v2`. |
| Username | Address Manager user with API access. |
| Password | Password for that user. Stored securely by Raycast. |

You can change these later from Raycast Settings → Extensions → BlueCat BAM Lookup.

## Usage

- Type `bam`, press <kbd>Tab</kbd>, enter an IP, CIDR, or DNS name, and press <kbd>Enter</kbd>.
- Or open **BAM Lookup** and type in the search bar; results update as you type.
- To search from anywhere in the Raycast root search, add **BAM Lookup** as a fallback command in Raycast Settings → Extensions → Fallback Commands.

| Shortcut | Action |
| --- | --- |
| <kbd>Enter</kbd> | Open in BlueCat |
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>N</kbd> | Open the containing network (IP address results) |
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>I</kbd> | Copy object ID |
| <kbd>⌘</kbd> <kbd>⇧</kbd> <kbd>U</kbd> | Copy BlueCat web UI URL |

## Troubleshooting

- **Login failed (401)** — check the username and password, and confirm the user's access type includes API access.
- **BlueCat API error** — the error message from Address Manager is shown in the toast. Confirm the server URL is correct and that the RESTful v2 API is enabled.
- **No "Open in BlueCat" action** — the extension could not determine the parent network (IP addresses) or zone (DNS records) needed to build the web UI link.
