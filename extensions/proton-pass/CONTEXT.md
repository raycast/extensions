# Proton Pass Extension Glossary

## CLI availability

Whether the Proton Pass CLI can be located and executed by the extension. A CLI available in a terminal is not necessarily available to Raycast because both may have different environments.

## CLI session

Authentication state owned by the Proton Pass CLI. The extension never stores Proton account credentials and relies on this session.

## Vault

A Proton Pass container holding items. Search spans every accessible vault; a vault filter only narrows the current view.

## Item

A Proton Pass record. The initial extension scope includes login and alias items.

## Item summary

Non-secret item data used to build lists. It includes the item's identity, type, title, and vault. Secret fields are fetched only after an explicit user action.

## Item reference

Stable identity of an item, composed of its share ID and item ID.

## Item details

Content of an item loaded after an explicit user action. Details may contain secret fields and are never part of an item summary.

## Pinned item

An item promoted to the top of the global search by the user. Pinning belongs to the extension and does not modify Proton Pass.

## Recently used item

An item whose details or useful field was most recently accessed through the extension. Unpinned items are ordered by this local activity.

## Item activity

Extension-owned state describing whether an item is pinned and when it was last used. Item activity is separate from cached Proton Pass data.

## Cached item data

Previously fetched Proton Pass item summaries or metadata kept locally to make the extension immediately useful while fresh data is loading. Cached data does not imply that the CLI session is ready, and its freshness must remain visible to the caller.

## Authenticator item

A login item containing at least one TOTP field and therefore able to produce a current authentication code.
