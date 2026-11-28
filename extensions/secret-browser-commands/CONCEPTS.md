# Concepts

Shared domain vocabulary for this project — entities, named processes, and status concepts with
project-specific meaning. Seeded with core domain vocabulary, then accretes as ce-compound and
ce-compound-refresh process learnings; direct edits are fine. Glossary only, not a spec or
catch-all.

## Catalog

### Command
An internal page a Chromium browser exposes at its own URL scheme, listed by this extension so it
can be searched and opened. A Command is the unit of everything here: it carries the address, a
description, which Browsers serve it, and any caveats about using it.

Commands are classified along two axes the browser itself draws and this project preserves.
*Internal debugging pages* are harmless diagnostics that load only once the browser's own
internal-debugging setting is enabled. *Crash commands* deliberately crash, hang, or quit the
browser and are a different risk class entirely — collapsing the two is a recurring mistake, because
a preference that hides one should not hide the other. Independently of that, a Command may carry any combination of *removed*
(no Browser serves it any more, kept for reference), *flag-gated* (real, but needs a named browser
feature switched on), or *unusable* (the browser advertises the address but will not load it in a
tab, typically because it is interface drawn inside the browser rather than a page). A flag-gated Command is also technically unusable until its feature is on, which is why the two are tracked separately rather than as one state.

### Browser
A Chromium-derived application this extension can search Commands for and open them in. A Browser is
identified by its own URL scheme and, when installed, by the application bundle discovered on disk —
the latter is what makes it launchable and supplies its icon. A Browser the extension knows about is
not necessarily one the user has: an uninstalled Browser still filters the Command list, because the
list is useful as reference without the application.

### Census
The measurement that produces which Browsers serve which Commands. Each Browser is asked, through
its own interface, for the list of internal pages it exposes, and that answer becomes that Browser's
support data. The Census replaced an assumption that every Chromium browser served every Command,
which was not true. It is a point-in-time measurement against specific Browser versions, so it goes
stale as browsers ship and is expected to be re-run rather than edited by hand.

## Flagged ambiguities

- "Command" is overloaded: this extension *is* a Raycast command, and the things it lists are also
  Commands. In this project's prose, Command always means the browser page; the Raycast surface is
  named explicitly when it needs referring to.
- "Command", "URL", and "address" had all been used for the same thing. Settled: the things in the
  list are Commands, and URL refers only to the address string itself. "Address" is not used.
