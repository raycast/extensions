# Local Docs Fallback Guide

This document explains the pattern implemented in this extension so it can be reproduced in other Raycast documentation-search extensions for different libraries.

The goal is simple:

- use the official online docs by default
- when Raycast cannot reach them, let the user point the extension at a downloaded local docs folder
- keep the recovery UX explicit and predictable

This guide is written from the NumPy implementation, but the same shape should work for SciPy, pandas, PyTorch, Matplotlib, and similar documentation-based extensions.

## What We Changed

We changed the extension from a remote-only docs client into a two-source client:

1. `online`
   The extension tries the live docs site first.

2. `local`
   The extension reads the inventory and HTML pages from a user-selected local docs folder.

Use whichever name best matches the target repo, but keep the behavior consistent: the online/live docs mode should be
the default and should not require an initial user choice.

There is no bundled offline snapshot anymore. The extension now supports only:

- online docs
- local downloaded docs

## Behavior We Implemented

### Inventory loading

Before:

- inventory was always loaded from the public docs URL

Now:

- in `online` mode, inventory loads from the public URL first
- if the remote request fails and `Local Docs Directory` is configured, inventory loads from disk instead
- in `local` mode, inventory always loads from disk

### Detail page loading

Before:

- detail HTML was always fetched from the online docs page

Now:

- if the current source is local, the extension loads the matching HTML file from disk
- if the current source is remote, it continues fetching from the online docs page
- if remote detail loading fails in `online` mode and a local folder is configured, it falls back to the local HTML file

### First-open source selection

Before:

- Raycast could show the documentation source dropdown before the user first opened the command because the preference
  was marked as required

Now:

- online docs are selected by default
- the source preference remains available in command preferences
- the source preference is optional in `package.json`
- the command code treats a missing source preference as `online`

This matters for other repos because a Raycast dropdown can have a default value and still create an unnecessary
first-run interruption when it is marked as required. For this fallback pattern, the user should only visit preferences
when they explicitly want local docs or need to recover from a network failure.

### User guidance

Before:

- the extension surfaced the raw fetch failure when docs could not be reached

Now:

- the first blocked fetch shows a recovery item in the list
- that item explains that Raycast could not connect
- it tells the user to download the docs ZIP, extract it, and configure `Local Docs Directory`
- it offers actions to open command preferences, retry, and open the docs repository in the browser

## Files Added Or Updated

These are the key implementation files in this repo:

- [src/lib/docs-source.ts](/Users/faria/git/NumPy-Documentation-Search-Raycast/src/lib/docs-source.ts)
  Shared source resolver for remote vs local loading.
- [src/hooks/useInventory.ts](/Users/faria/git/NumPy-Documentation-Search-Raycast/src/hooks/useInventory.ts)
  Hook that loads the inventory and exposes the resolved source plus remote error state.
- [src/hooks/useDocDetail.ts](/Users/faria/git/NumPy-Documentation-Search-Raycast/src/hooks/useDocDetail.ts)
  Hook that loads detail content from the current source.
- [src/numpy-docs.tsx](/Users/faria/git/NumPy-Documentation-Search-Raycast/src/numpy-docs.tsx)
  Command UI, recovery item, and recovery actions.
- [package.json](/Users/faria/git/NumPy-Documentation-Search-Raycast/package.json)
  Raycast preferences for source mode and local docs directory.
- [src/__tests__/docs-source.test.ts](/Users/faria/git/NumPy-Documentation-Search-Raycast/src/__tests__/docs-source.test.ts)
  Tests for local fallback behavior.
- [README.md](/Users/faria/git/NumPy-Documentation-Search-Raycast/README.md)
  User-facing documentation for the local-docs workflow.
- [CHANGELOG.md](/Users/faria/git/NumPy-Documentation-Search-Raycast/CHANGELOG.md)
  User-visible record of the feature.

## Source Model

The implementation is centered around a small source abstraction.

### Types

Use two source types:

```ts
type DocumentationSourceMode = "online" | "local";
type ResolvedDocumentationSource = "remote" | "local";
```

Recommended meaning:

- `DocumentationSourceMode`
  The user-selected preference.
- `ResolvedDocumentationSource`
  The source that was actually used after fallback.

### Loader responsibilities

Implement a shared loader module that:

1. loads the symbol inventory
2. loads the documentation detail page
3. knows how to switch between remote and local
4. returns the actual resolved source
5. preserves the remote error when fallback succeeded

That last point matters because it lets the UI say:

- live download failed
- local docs are being used instead

without blocking the user from searching.

## Local Docs Contract

This is the most important assumption to keep consistent across extensions.

For this extension, the user selects the downloaded docs folder, and the extension looks under:

```text
<selected-folder>/stable/
```

From there it expects:

- `objects.inv`
- the HTML tree referenced by inventory entries

For NumPy, that means files such as:

```text
stable/objects.inv
stable/reference/generated/numpy.linspace.html
```

### Windows checkout compatibility

Some documentation repositories use a symlink named `stable` that points to a versioned docs folder, such as:

```text
stable -> 2.3
```

On Windows, especially when Git symlink support is disabled, that symlink can be checked out as a regular text file named
`stable` whose contents are the target path:

```text
2.3
```

If the loader always assumes `stable` is a directory, local docs fail on Windows because the extension tries to read paths
like:

```text
stable/objects.inv
stable/reference/generated/numpy.linspace.html
```

When `stable` is a text file, those paths are invalid. To make the fallback portable, resolve `stable` before building the
inventory or HTML path:

1. Build `<selected-folder>/stable`.
2. Try to read it as text.
3. If reading succeeds and the trimmed contents are non-empty, treat those contents as the symlink target.
4. Resolve that target relative to the selected folder.
5. If reading fails, keep using `<selected-folder>/stable` as a normal directory.

The implementation in this repo follows this shape:

```ts
async function getStableDocsDirectory(localDocsDirectory: string | undefined, deps: LoaderDeps): Promise<string> {
  const directory = requireLocalDocsDirectory(localDocsDirectory);
  const stablePath = path.join(directory, "stable");

  try {
    const symlinkTarget = (await deps.readTextFileImpl(stablePath)).trim();
    if (symlinkTarget) {
      return path.resolve(directory, symlinkTarget);
    }
  } catch {
    // Most local docs downloads have a real stable directory. Windows Git checkouts
    // can turn the stable symlink into a text file containing the target path.
  }

  return stablePath;
}
```

Use the resolved directory for both inventory and detail loading:

```ts
const directory = await getStableDocsDirectory(localDocsDirectory, deps);
const inventoryPath = path.join(directory, "objects.inv");
const htmlPath = path.join(directory, item.docPath.split("#")[0] ?? item.docPath);
```

This keeps the same user-facing contract. Users still select the downloaded docs folder, and the extension still uses the
`stable` target automatically whether it is a real directory, a real symlink, or a Windows text-file symlink placeholder.

If you reuse this pattern for another library, decide the local folder contract up front:

- do users pick the exact version folder
- or do they pick a parent folder and the extension always uses `stable`

In this repo we chose the second option because it makes setup simpler for users.

## Detailed Reproduction Steps

Use these steps when porting the feature to another extension.

### 1. Identify the current remote-only loading path

Find:

- the inventory fetch
- the detail-page fetch
- the command UI state that currently shows fetch failures

In this repo that was:

- inventory fetch hook
- detail fetch hook
- the list empty/error state in the command component

### 2. Extract the source resolution into a shared loader

Create a module similar to `src/lib/docs-source.ts`.

It should expose:

- `loadInventory(options)`
- `loadDocDetail(options)`

Both functions should accept:

- the source mode
- the local docs directory
- the current item for detail loading

Both functions should return:

- the loaded data
- the resolved source
- the remote error if fallback happened after a remote failure

### 3. Keep your library-specific parsing logic separate

Do not move parsing logic into the source resolver.

Keep the source resolver focused on:

- where bytes/text come from
- whether they come from network or disk

Keep library-specific parsing in the existing files that already understand:

- `objects.inv`
- HTML structure
- markdown rendering

In this repo:

- inventory parsing stays in `src/lib/inventory.ts`
- HTML parsing stays in `src/lib/doc-detail.ts`

### 4. Update the inventory hook

The inventory hook should:

- call the shared loader
- expose `data`
- expose `source`
- expose `remoteError`
- still expose `error` when nothing could be loaded
- keep a `revalidate()` method

This is what enables the UI to distinguish:

- total failure
- recovered failure using local docs

### 5. Update the detail hook

The detail hook should:

- use the resolved inventory source
- load from disk when the current source is local
- fall back from remote HTML to local HTML when possible

### 6. Add Raycast preferences

Add two preferences in `package.json`:

1. `Documentation Source`
   A dropdown with:
   - `Online`
   - `Local Docs Directory`

2. `Local Docs Directory`
   A directory selector

Make the descriptions explicit. The user should know exactly what folder they are meant to select.

The documentation source dropdown should be optional, even though it has a default:

```json
{
  "name": "documentationSourceMode",
  "type": "dropdown",
  "required": false,
  "title": "Documentation Source",
  "description": "Choose where the extension should load documentation from",
  "default": "online",
  "data": [
    {
      "title": "Online",
      "value": "online"
    },
    {
      "title": "Local Docs Directory",
      "value": "local"
    }
  ]
}
```

Do not mark this preference as required if the online docs should be the default first-open experience. Keeping it
optional lets Raycast launch the command immediately while still allowing users to switch to local docs later.

For this extension, the description is effectively:

- choose the downloaded docs folder
- the extension will look inside its `stable` subfolder

### 6a. Add a runtime fallback for missing source preferences

Do not rely only on `package.json` defaults. In the command component, treat an unset preference as `online` before
passing it into inventory or detail hooks:

```ts
interface Preferences {
  documentationSourceMode?: DocumentationSourceMode;
  localDocsDirectory?: string;
}

const preferences = getPreferenceValues<Preferences>();
const documentationSourceMode = preferences.documentationSourceMode ?? "online";
```

Then pass `documentationSourceMode` to source-aware loaders:

```ts
useInventory({
  localDocsDirectory: preferences.localDocsDirectory,
  mode: documentationSourceMode,
});

useDocDetail({
  inventorySource,
  item: selectedItem,
  localDocsDirectory: preferences.localDocsDirectory,
  mode: documentationSourceMode,
});
```

This keeps TypeScript honest after making the preference optional and protects existing installs where Raycast may not
have stored a value yet.

### 7. Replace raw error UX with recovery UX

In the command UI:

- replace the generic “unable to load inventory” view
- add a recovery item with markdown instructions
- show recovery even when fallback succeeded, so the user understands why local docs are being used

Recommended recovery actions:

- open command preferences
- retry the live download
- open the docs repository or download source in the browser

### 8. Document the download flow for users

Update the README and the in-app instructions with the same setup flow.

For this repo, the final guidance is:

1. download the docs ZIP
2. extract it locally
3. set `Local Docs Directory` to the downloaded docs folder
4. the extension will use the `stable` subfolder automatically

Keep the wording generic unless the extension truly depends on a specific network condition. Here we intentionally say only that Raycast was not able to connect.

### 9. Add tests for fallback behavior

You need tests for at least these cases:

1. remote inventory fails and local inventory succeeds
2. remote inventory fails and no local docs are configured
3. local HTML detail loads from disk
4. local inventory loads when `stable` is a text file containing a version folder
5. local HTML detail loads when `stable` is a text file containing a version folder

In this repo, the tests avoid a committed binary fixture by creating a tiny synthetic `objects.inv` payload in memory using zlib compression.

That pattern is useful for the other extensions too because it keeps the repo smaller and avoids shipping binary test data.

For the Windows symlink-file case, create a temporary docs folder like this:

```text
<tmp-docs>/
  stable        # text file containing "2.3"
  2.3/
    objects.inv
    reference/generated/example.html
```

Then assert that both inventory and HTML detail loading resolve through `2.3/`.

### 10. Verify end-to-end

Run:

```bash
npm run test
npx tsc --noEmit
npm run lint
npm run build
```

If the Raycast commands require elevated access in your environment, run them with whatever approval flow you normally use.

## What You Need To Reuse This In Another Library

For each new extension, gather these inputs first:

### Required inputs

- the live inventory URL
- the live base documentation URL
- the local docs folder structure
- the rule for converting inventory entries into local HTML file paths
- the HTML parser logic for that library’s docs pages

### Questions to answer before implementation

- Does the library publish Sphinx `objects.inv`?
- Does the downloaded docs ZIP preserve the same relative HTML paths as the live site?
- Should the user point the extension at a version folder directly, or at a parent folder that contains `stable/`?
- Does the library use `stable`, `latest`, version-number folders, or some other layout?
- Are anchor fragments in the inventory usable as-is for local HTML parsing?

If the answers differ from NumPy, adjust the local path resolver and the instructions accordingly.

## Porting Checklist

- Copy the source abstraction pattern.
- Rename URLs and paths for the target library.
- Keep parsing logic separate from source selection.
- Add `Documentation Source` and `Local Docs Directory` preferences.
- Mark `Documentation Source` as optional with `default: "online"`.
- Add a command-level fallback from missing source preference to `"online"`.
- Update the command UI to show recovery guidance.
- Update the README.
- Update the changelog.
- Add fallback tests.
- Verify `test`, `tsc`, `lint`, and `build`.

## Recommended Customization Points For Other Libraries

When you adapt this to a different library, these are the parts you will likely customize:

### Inventory constants

- online inventory URL
- online document base URL

### Local directory resolution

- whether the selected folder is the version folder itself
- whether the extension should force `stable/`
- whether a different subfolder such as `latest/` is more appropriate
- whether `stable` or `latest` may be a symlink that turns into a text file on Windows

### HTML path mapping

- some libraries may not map inventory paths directly to on-disk HTML paths
- if they differ, add a small path-normalization helper in the source resolver

### Recovery copy

Keep the structure, but replace:

- repository name
- docs download source
- library-specific folder expectations

## Suggested Default Pattern For Other Extensions

If you want consistency across your similar plugins, I recommend standardizing on this exact UX:

- default mode is `Online`
- `Documentation Source` is not a required Raycast preference
- second mode is `Local Docs Directory`
- when remote access fails, say only that Raycast could not connect
- tell the user to download the docs ZIP and extract it
- tell the user exactly which folder to select
- keep the loader contract explicit and simple

That gives you one repeatable model across all of the library extensions instead of a slightly different fallback design in each repo.
