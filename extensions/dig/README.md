# dig Extension for Raycast

DNS lookup and nameserver query using the built-in host command on macOS. Built for [Raycast](https://raycast.com).

## Query a domainname
`dig raycast.com` returns all results from domain

`dig raycast.com ns` returns all name server (NS-servers)

`dig raycast.com mx` returns all mail exchanger records (MX record) 

`dig raycast.com txt` returns all TXT-records from domain

See supported types below for all types:

## Supported types

a, aaaa, afsdb, apl, caa, cert, cname, dhcid, dlv, dname, dnskey, ds,
hip, ipseckey, key, kx, loc, mx, naptr, ns, nsec, nsec3, nsec3param,
ptr, rrsig, rp, sig, soa, spf, srv, sshfp, ta, tkey, tlsa, tsig, txt,
axfr, ixfr, opt
