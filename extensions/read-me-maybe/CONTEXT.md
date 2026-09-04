# Read Me Maybe

Read Me Maybe presents a menu-bar summary of the message attention indicators exposed by the messaging applications in the Source Catalog, and the View Unreads command shows each configured Source's status from the most recent scan.

## Language

**Source**:
A messaging application in the Source Catalog that can be enabled or disabled in the aggregate.
_Avoid_: Provider, integration, supported app

**Source Catalog**:
The user-configured set of Sources — at most one per Application — retained across launches and seeded with Messages on first use.
_Avoid_: Built-ins, supported apps

**Application**:
The installed application bundle every Source links to. A Source's Name, Dock Item Name, icon, and Open Command default derive from it.
_Avoid_: App path, bundle name

**Dock Item Name**:
The exact title of the macOS Dock tile a Source's scan matches. It is derived from the Application and the user cannot set it.
_Avoid_: App name, application name

**Name**:
A Source's user-visible title in the menu, derived from its Application and not user-editable.
_Avoid_: Display name, label

**Badge**:
A source's user-visible Dock indicator, represented either by a numeric count or a nonnumeric attention signal.
_Avoid_: Notification count

**Open Command**:
A user-configurable shell command that runs when the user selects a Source row. Its default launches that Source's application.

**Unread Count**:
The numeric contribution derived from a source's Badge and included in the menu-bar total.
_Avoid_: Notification count

**Attention Badge**:
A nonnumeric Badge that signals unread activity without disclosing a quantity. It is excluded from the numeric Unread Count while remaining qualitatively labeled in the breakdown.
_Avoid_: One unread message

**Excluded Unread Activity**:
One or more Attention Badges present. While present, the menu bar shows a red dot on the upper right corner of its message icon. When no numeric unread messages are present, the menu bar also hides its title.

**Threshold Badge**:
A numeric Badge expressed as a lower bound, such as `9+`. Its lower bound contributes to the Unread Count while the breakdown preserves the threshold display.
_Avoid_: Exact count

**Unavailable Source**:
An enabled Source whose Dock Badge cannot currently be read. It does not contribute to the aggregate and is shown with its availability reason.
_Avoid_: Zero unread

**Partial Result**:
An aggregate for which at least one enabled Source is an Unavailable Source. It sums only readable Sources and is explicitly labeled as incomplete.
_Avoid_: Total unread

**Setup Gate**:
The locally retained record that a user-triggered diagnostic read has succeeded. It permits background Badge reads but contains no Badge or message data. It is distinct from Access Check Status. A legacy gate without an Access Check Status is invalid and is cleared on the first menu command load, requiring a new diagnostic read. A closed gate takes precedence over a historical successful status. Changing the Source Catalog or the enabled Source selection does not close the gate.
_Avoid_: Cached result

**Access Check Status**:
The locally retained outcome and time of the latest user-triggered access diagnostic. It records only whether access was checked, requires Accessibility, or requires Automation; a transient failed check leaves the retained status unchanged. A later background permission failure does not replace it. It contains no Badge, Source, or message data. A later successful Access Check replaces a retained explicit failure. Disabling all Sources temporarily hides, but does not clear, a retained explicit permission failure. An Access Check Status is not shown after successful setup, but a retained explicit permission failure is shown with Check Access without its timestamp.
_Avoid_: Cached result, diagnostic result

**Access Check Result**:
The current-session per-Source outcome of a user-triggered access diagnostic. It uses the Sources enabled when the user selects Check Access. A successful result is immediately displayed as the menu's Unread Count, and it may show Badge-derived labels while the menu remains open. It is never retained and never writes the Unread Snapshot. The check begins immediately when the user selects Check Access.
_Avoid_: Access Check Status, cached result

**Unread Snapshot**:
The locally retained result and read time of the most recent Badge scan. The menu's refresh cycle and the View Unreads command's on-demand refresh both write it, each replacing it with whatever that scan produced — including permission-failure states; the Access Check Result never writes it. The View Unreads command also reads it, so both surfaces show the same per-Source statuses. Before the first scan it does not exist.
_Avoid_: Cached result, last scan

**Not Available**:
The availability state of an enabled Source whose Dock item, matched by its Dock Item Name, is absent from the macOS Dock. It does not prevent a successful Access Check or background Badge reads for other enabled Sources.
_Avoid_: Zero unread, offline
