# Third-party notices

## raindrop-io Raycast extension

Parts of this extension are derived from the Raindrop.io Raycast extension
published in the official Raycast extensions repository:

- Source at the adopted revision: https://github.com/raycast/extensions/tree/4cd99da7dfe0dbe794f371f7ec59550d52558c2b/extensions/raindrop-io
- License at that revision: https://github.com/raycast/extensions/blob/4cd99da7dfe0dbe794f371f7ec59550d52558c2b/LICENSE
- Pinned commit: `4cd99da7dfe0dbe794f371f7ec59550d52558c2b`
- Retrieved: 2026-11-05

Adopted files and their local counterparts:

| Upstream | Local | Changes |
| --- | --- | --- |
| `src/search.tsx` | `src/search.tsx` | data hooks read ME; server-side search disables local filtering |
| `src/save_browser_tab.tsx` | `src/save.tsx` | uses the existing Chrome/Edge/Arc page capture |
| `src/components/BookmarkItem.tsx` | `src/components/BookmarkItem.tsx` | ME fields; inline edit and live detail refresh; conflict opens the ME manager; Move to Trash uses one shared list/detail/editor action; restore stays in ME |
| `src/components/BookmarkForm.tsx` | `src/components/BookmarkForm.tsx`, `src/components/BookmarkFields.tsx` | native fields extracted for create/edit; create container uses ME duplicate guard and durable submission; no collection creation |
| `src/components/CollectionsDropdown.tsx` | `src/components/CollectionsDropdown.tsx` | stable list key; native labels/icons and nonrepeated collection paths |
| `src/helpers/collections.ts` | `src/helpers/collections.ts` | Raindrop user-group ordering removed |
| `src/hooks/useRequest.ts` | `src/hooks/useRequest.ts` | originally adapted; current orchestration uses ME hooks, per-library selection and local request lifecycle, with no Raindrop user lookup |
| `src/types.ts` | `src/types.ts` | subset used by the components; ME entity ids are strings |

## Reuse and distribution boundaries

- The reused source is the **Raycast extension** listed above, not the full Raindrop web application or its backend. The additional collection SVG assets have a separate source and copyright below. The table records the provenance of adapted UI, collection helpers and view types; local behavior has changed as described.
- The Raindrop REST/OAuth/account client, Pro/AI account features, cloud data operations are not distributed by this extension. Data hooks with similar filenames implement ME queries rather than the upstream REST client.
- Bookmark data is accessed through ME’s installed local stdio helper. Versioned edits, duplicate checks, pending-command handling and ME-specific projections live in this companion’s adapter code; the data core, browser manager, import, synchronization and pinyin indexing remain in the separate ME project.
- `src/core-api.d.ts` is an exact declaration snapshot from ME, documented in [protocol provenance](https://github.com/Schnee013/mark-everything-raycast/blob/main/docs/protocol-source.json). It is a type contract, not a copy of the data core or sync implementation.
- The light and dark Mark Everything icons were supplied by this project’s maintainer and resized to the required dimensions. They are not Raindrop icons. Project names identify provenance only; no affiliation, sponsorship or endorsement by Raindrop is claimed.

## License preservation

The complete upstream MIT license, including **Copyright (c) 2021 Raycast**, is preserved verbatim in [assets/THIRD-PARTY-NOTICES.txt](assets/THIRD-PARTY-NOTICES.txt). This file is included both in the public source and in the bundled extension. The project’s [MIT license](https://github.com/Schnee013/mark-everything-raycast/blob/main/LICENSE) does not replace or remove the upstream notice.

## Raindrop.io application collection icons

The 199 files without the `twemoji-` prefix in `assets/collection-icons/` are unchanged copies of `src/assets/icons/*.svg` from [raindropio/app](https://github.com/raindropio/app/tree/94ba9cbb88002987ed49cbc3848c93d396ae47a1/src/assets/icons), fixed commit `94ba9cbb88002987ed49cbc3848c93d396ae47a1`. They are MIT licensed, **Copyright (c) 2024 Rustem Mussabekov**. The complete original notice is also included in `assets/THIRD-PARTY-NOTICES.txt`.

`assets/collection-icons.json` lists these packaged filenames. ME's stored `icon` is mapped to the corresponding local asset; native tinting keeps the monochrome shapes readable in light and dark appearances. This adds no Raindrop API or account dependency. Online covers from Icons8, Iconfinder, or a user's Raindrop library are not included; the repository MIT license is not treated as permission to redistribute those separate resources.

## Twemoji color collection icons

32 files named `twemoji-*.svg` are selected from [jdecked/twemoji v17.0.3](https://github.com/jdecked/twemoji/tree/b6b55fef1e8636b540a6d016a4729ca8cdf2e60b), commit `b6b55fef1e8636b540a6d016a4729ca8cdf2e60b`. Graphics by Twitter, Inc. and other contributors are licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), separately from the project's MIT code. SVG bytes are unchanged; only filenames are descriptive local names. No Twemoji parser, CDN or runtime account dependency is included. These are alternative choices, not a restoration of privately selected Raindrop online images.

The full notice is in `assets/TWEMOJI-LICENSE.txt`; `assets/twemoji-source.json` records every source path and SHA-256. Both files are included in the extension bundle.
