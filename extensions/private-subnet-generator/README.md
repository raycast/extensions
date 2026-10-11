# Private Subnet Generator

A Raycast extension that generates random private IPv4 and IPv6 prefixes.
IPv4 prefixes follow [RFC 1918](https://www.rfc-editor.org/rfc/rfc1918).
IPv6 prefixes are Unique Local Addresses according to [RFC 4193](https://www.rfc-editor.org/rfc/rfc4193).

Random prefixes reduce the risk of collisions.
Collisions happen when networks are merged or connected over a VPN.

## Commands

### Generate Private IPv4 Prefix

Generates a random `/24` from `10.0.0.0/8`, `172.16.0.0/12` or `192.168.0.0/16`.
Every free `/24` is equally likely.
Therefore, most prefixes come from `10.0.0.0/8`.

The dropdown in the search bar restricts the pool to one of the three ranges.
_Include All Prefixes_ is the default.

### Generate Private IPv6 Prefix

Generates a random `/48` from `fd00::/8`.
The 40 bits after `fd` are the random Global ID.

## Prefix Length

Both commands accept an optional `length` argument.
Type it after the command name in Raycast's root search.
Both `20` and `/20` work.
Without an argument, the IPv4 command generates a `/24`, the IPv6 command a `/48`.

The list shows an error instead of a prefix in these cases:

- The length is not a number.
- The length is out of range, like `/33` for IPv4.
- The length is shorter than every pool, like `/7` for IPv4.
- Every subnet of that length is excluded, like `/17` in `192.168.0.0/16`.

With _Include All Prefixes_, only the pools that fit the length are used.
For example, `/12` only draws from `10.0.0.0/8` and `172.16.0.0/12`.

## Actions

| Action              | Shortcut                       |
| ------------------- | ------------------------------ |
| Copy to Clipboard   | `↵`                            |
| Generate New Prefix | `⌘ N` (macOS), `⌃ N` (Windows) |
| Remove Entry        | `⌃ X`                          |
| Clear History       | `⌃ ⇧ X`                        |

_Remove Entry_ and _Clear History_ are available on history entries.

## History

Previously generated prefixes appear in a _History_ section below the new prefix.
The newest entry comes first.
Each command keeps its own history.

The extension preferences control the history:

- **History** turns the history on or off.
  It is on by default.
  When it is off, the next launch of either command deletes all stored entries.
- **History Size** sets how many previous prefixes each command keeps.
  The default is 20.
  An empty or invalid value falls back to 20.
  `0` hides the history.

## Excluded Ranges

A generated prefix never overlaps one of the following ranges.

### IANA Special-Purpose Registries

All blocks of the [IPv4](https://www.iana.org/assignments/iana-ipv4-special-registry/) and [IPv6](https://www.iana.org/assignments/iana-ipv6-special-registry/) special-purpose address registries are excluded.
The Private-Use and Unique-Local blocks are the exception, because they are the pools themselves.
Copies of both registries are in `iana-ipv4-special-registry-1.csv` and `iana-ipv6-special-registry-1.csv`.

### Common Defaults

Vendors and tools use these ranges by default.

| Range                 | Used by                              |
| --------------------- | ------------------------------------ |
| `10.0.0.0/24`         | Xfinity gateways                     |
| `10.0.1.0/24`         | Apple AirPort                        |
| `10.42.0.0/16`        | k3s pod network                      |
| `10.43.0.0/16`        | k3s service network                  |
| `10.88.0.0/16`        | Podman default network               |
| `10.96.0.0/12`        | Kubernetes (kubeadm) service network |
| `10.244.0.0/16`       | Flannel pod network                  |
| `10.254.0.0/16`       | Router loopbacks and infrastructure  |
| `10.255.0.0/16`       | Router loopbacks and infrastructure  |
| `172.17.0.0/16`       | Docker default bridge                |
| `192.168.0.0/24`      | Consumer routers                     |
| `192.168.1.0/24`      | Consumer routers                     |
| `192.168.2.0/24`      | Telekom Speedport, Belkin            |
| `192.168.100.0/24`    | Cable modem management (DOCSIS)      |
| `192.168.178.0/24`    | FRITZ!Box                            |
| `fd00::/48`           | All-zero Global ID                   |
| `fd00:ec2::/32`       | AWS VPC services (DNS, NTP, IMDS)    |
| `fdff:ffff:ffff::/48` | All-ones Global ID                   |

The ranges are defined in `src/lib/ranges.ts`.

## Development

Install the dependencies:

```bash
npm install
```

Run the extension in Raycast:

```bash
npm run dev
```

Run the tests:

```bash
npm test
```

Run the linter:

```bash
npm run lint
```

The tests also check that no pool is fully excluded at the default prefix length.
