# 0002 - Deeplink to a project by Asana gid

**Status:** Accepted
**Date:** 2026-05-29

## Context

We want external tools - first an After Effects script, later other Adobe / creative
apps - to open a specific project directly in its grid view (the `ProjectScreen`) inside
this extension. Raycast supports this through **deeplinks**: a `raycast://` URL that
launches a command and hands it a `launchContext` (URL-encoded JSON) received as
`props.launchContext`.

The open question was how the URL should identify *which* project to open. Three keys
were viable:

- **`year` + `name`** - maps 1:1 to how `snapshot.ts` stores projects; portable across
  machines; derivable by an external script from its own file path (walk up to the
  `YYYY` segment) without knowing the `projectsRoot` preference.
- **Absolute folder path** - trivial to match, but machine-specific. The Gdrive root can
  differ per machine / symlink, so a path baked into a link by one tool may not equal the
  installed `projectsRoot`, breaking the match.
- **Asana `gid`** - the task id already extracted from each project's `Asana.html` and
  stored as `links.gid`. Globally unique, stable across folder renames, and the canonical
  key the rest of the ecosystem (Asana, Magic Link Machine) already uses.

## Decision

The deeplink identifies a project by its **Asana gid**.

Contract:

```
raycast://extensions/hugini/project-folders/search-projects?context=<urlencoded JSON>
```

where the JSON is `{"gid":"<asana-task-gid>"}`. Note the query parameter is **`context`**,
not `launchContext` - that is what `createDeeplink` emits and what Raycast maps onto
`props.launchContext` inside the command. The `hugini/project-folders` segments come from
`package.json` (`owner || author`, then `name`); the canonical, always-correct template is
whatever the in-extension **Copy Deeplink** action emits (via `createDeeplink` from
`@raycast/utils`). External callers replicate that literal string and substitute the gid.

Behavior on launch:

1. Read `launchContext.gid`. The command reads **only** `gid` and ignores any other keys,
   so the context shape can gain fields later without breaking existing callers.
2. Look the gid up in the cached index. If two projects share a gid, the most recent
   (the index is already sorted by mtime descending) wins.
3. On a miss, force a disk rescan (`revalidate`) and retry the match once - this catches a
   project created or linked after the last snapshot.
4. On a match, push `ProjectScreen` on top of the normal list. Escape returns to the full
   list.
5. On a still-miss after the rescan, stay on the list and show a failure toast naming the
   gid.

A "Copy Deeplink to Project" action is exposed on each list item, shown only when the
project has a gid.

## Why not path or year + name

`year` + `name` was the runner-up and is genuinely portable, but the gid is a *stronger*
contract for the external callers we care about: it is the one identifier that is already
unique and stable across the whole tool ecosystem, survives folder renames, and does not
encode any folder-naming convention a caller would have to reproduce. Absolute path was
rejected outright for being machine-specific.

## Raycast Beta scheme gotcha

`createDeeplink` only emits the stable `raycast://` scheme (or `raycastinternal://` for
alpha builds). Raycast **Beta** installs alongside stable and *also* claims `raycast://`,
so with both apps present macOS can route a `raycast://` link to the stable app - which
does not have a locally-developed extension installed - yielding "No enabled command
'search-projects' found". Beta owns the unambiguous `raycast-x://` scheme.

`src/deeplink.ts` wraps `createDeeplink` and rewrites the scheme to `raycast-x://` when the
extension is running under Beta, detected via `environment.supportPath` containing
`com.raycast-x.macos`. This makes the **Copy Deeplink** action always target the running
app. Once the extension is published and installed normally (not a dev extension), plain
`raycast://` resolves unambiguously and the rewrite is a harmless no-op on stable.

## Consequences

- A project **without** an `Asana.html` has no gid and therefore cannot be targeted by a
  deeplink. This is acceptable: these are creative jobs that effectively always have an
  Asana task, and the missing-gid case degrades to "no Copy Deeplink action / toast on
  launch", not a crash.
- External scripts hardcode the URL shape, so the `launchContext` contract is now a
  published interface. Changes must be **additive** (new optional keys), never a rename or
  removal of `gid`. This is the main thing that makes the decision hard to reverse.
- The match depends on `links.gid` extraction staying correct (`/\d{10,}/` against the
  Asana URL). If Asana changes its URL shape, both this feature and the existing Magic
  Link Machine integration break together - they already share that extraction.
- Room to grow: a future link could carry extra keys (e.g. a subfolder to open, or a
  specific tool link to fire) without a new contract, because unknown keys are ignored
  today.
