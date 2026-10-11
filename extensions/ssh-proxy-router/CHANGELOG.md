# SSH Proxy Router Changelog

## [Initial Store Release] - {PR_MERGE_DATE}

- Route exact hosts and wildcard domains through an SSH SOCKS tunnel while other hosts connect directly.
- Start, stop, inspect, and test routing from a menu-bar command.
- Restore previous macOS automatic-proxy settings when stopping.
- Support Raycast 2 with the updated extension SDK.
- Add shared read-only diagnostics and offline tests for routing and recovery behavior.
- Limit background SSH reconnect attempts and status checks to reduce idle activity.
- Restrict PAC serving to the PAC file and verify the active listener before enabling routing.
- Preserve backups and running agents after restoration failures; serialize lifecycle commands.
- Apply changed SSH preferences and preserve settings when the network-service selection changes.
- Allow Stop after network-service deletion and safely detach renamed services still using the router PAC.
- Match complete PAC URLs and retain private session URL history through Repair and failed cleanup, preserving unrelated local proxy settings.
