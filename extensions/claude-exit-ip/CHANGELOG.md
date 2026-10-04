# Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Show the exit IP, country, city, and ISP that claude.ai sees, read from Claude's own edge with verified provenance and IPv4 and IPv6 support.
- Degrade to country-only when the location lookup fails, and distinguish a blocked response from an unreachable one.
- Copy the IP, the IP with its location, or the ASN, with each action offered only in the card states where its value is settled.
- Refresh with ⌘R, rerunning both lookups and preventing a new IP from pairing with a previous IP's location.
