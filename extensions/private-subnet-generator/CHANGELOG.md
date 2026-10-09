# Private Subnet Generator Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Generate random private IPv4 prefixes according to RFC 1918.
- Generate random IPv6 Unique Local Address prefixes according to RFC 4193.
- Exclude the IANA special-purpose blocks and common vendor defaults.
- Restrict the IPv4 pool with a dropdown.
- Set the prefix length with an optional command argument.
- Keep a configurable history of generated prefixes.
