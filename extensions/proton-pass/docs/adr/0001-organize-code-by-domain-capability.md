# Organize the extension by domain capability

The extension is organized into modules for items, vaults, authenticator, passwords, activity, and session rather than repeated technical layers or one module per Raycast command. Raycast commands remain thin entrypoints, Proton Pass CLI details stay in a `pass` adapter, and each domain module depends only on the subset of that adapter it uses; this gives feature changes locality and creates testable seams without introducing repositories, dependency-injection frameworks, or rich entity classes before they are needed.

Cached Proton Pass data and extension-owned item activity remain separate. Item summaries never contain secrets, cached metadata is explicitly allowlisted, and callers can distinguish cached data from fresh data and from CLI session readiness.
