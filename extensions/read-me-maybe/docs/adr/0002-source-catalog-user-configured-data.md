# The Source Catalog is user-configured data

Sources were pinned to a compiled catalog and per-app manifest preferences: adding a messaging app required a code change, a manifest edit, and a republish. We decided the Source Catalog is a user-owned, persisted data structure — rows in LocalStorage edited through a Configure Sources command — seeded with Messages and re-seeded when stored data is invalid. `Source` becomes a runtime-validated string, and the six per-app manifest preferences are removed; `includeUnreadActivity` remains a manifest preference.

## Considered Options

- The compiled catalog with per-app preferences is rigid: every new app ships through the publish pipeline, and the manifest grows a preference pair per app.
- Generic manifest preference slots (an `appPicker` per slot) stay publish-free but impose a hard ceiling on Sources and clutter Preferences.
- A hybrid of built-ins plus stored customs splits Sources into two kinds and two config surfaces.

## Consequences

- Compile-time exhaustiveness over Sources is lost; a validation boundary (strict parse-or-reseed, blocked duplicate Dock item names) replaces it.
- Configuration never reads the Dock: an unpinned app is simply Not Available with its availability reason, and the Configure Sources command never touches Accessibility or Automation, so it cannot disturb the Setup Gate.
- Changing the Source Catalog does not close the Setup Gate; no Source addition can ever require a new access check.
