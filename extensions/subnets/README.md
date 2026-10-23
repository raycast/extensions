# Subnets

A Raycast extension that breaks down an IPv4 or IPv6 subnet and lets you walk around it.

Type `10.0.0.0/16` and get:

| Item | Example |
| --- | --- |
| Network address | `10.0.0.0` |
| Network range | `10.0.0.0 - 10.0.255.255` |
| Prefix | `/16` |
| Addresses | `65,536` |
| Netmask (IPv4) | `255.255.0.0` |

…plus a **Navigate** section that reopens the calculator on a neighboring block:

- Split in two — `10.0.0.0/17` and `10.0.128.0/17`
- Next subnet — `10.1.0.0/16`
- Previous subnet — `9.255.0.0/16`
- Supernet — `10.0.0.0/15`

`⏎` on any value copies it, `⌘⏎` pastes it into the frontmost app, `⌘⇧.` copies the whole summary.
`⏎` on a navigation item opens that subnet in a new view; `esc` walks back.

## Input it accepts

- `10.0.0.0/16`, `2001:db8::/32`
- `10.0.0.0/255.255.0.0` (dotted netmask)
- `192.168.1.5` (bare address, treated as `/32`; IPv6 as `/128`)
- `172.16.5.23/20` — host bits are normalized to `172.16.0.0/20`, and the address you typed is shown as a tag
- Compressed, expanded, IPv4-mapped and zone-suffixed IPv6

