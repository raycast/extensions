# Am I Online Changelog

## [Initial Version] - {PR_MERGE_DATE}

- Detailed, layer-by-layer connection view with a clear online or offline verdict: interface, gateway, DNS, internet checks, and custom targets.
- Confirms the internet across several independent, certificate-verified endpoints, so captive portals and cached responses do not create false positives.
- Tests each DNS resolver by actually resolving a name, and checks gateway reachability with ping plus a TCP fallback.
- Shows whether the DNS resolver in use is local or public, with an optional lookup of the upstream resolver behind a local one.
- Flags an active VPN or a configured system proxy, since either changes how traffic reaches the internet.
- Optional custom targets (`host:port` or URLs) and optional public-IP display.
