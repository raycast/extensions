# Procore XER Fixer

Future Raycast extension for repairing Primavera P6 / Primavera Cloud `.xer` files that fail to import into the Procore Scheduling tool because of missing fields that Procore treats as required.

This README captures the working approach from the Memorial Regional Surgical & Critical Care Tower import issue. It is a build brief for a future extension, not a completed implementation.

## Purpose

The extension should let a user select:

- A Primavera `.xer` schedule export.
- Optionally, the Procore import `.log` file generated after a failed upload.

It should validate known Procore import blockers, generate a corrected XER copy, and optionally create a WBS GUID map for auditability.

Target workflow:

1. Select the source `.xer`.
2. Optionally select the Procore import log.
3. Review detected issues.
4. Generate a fixed `.xer` named with the suffix `_fixed.xer`.
5. Optionally generate a TSV map with `wbs_id`, `parent_wbs_id`, `wbs_path`, `guid`, and `wbs_name`.

## Background Case

Future example inputs should be stored in the extension repo under:

- `examples/Memorial Regional: Surgical & Critical Care Twr Exp 2.xer`
- `examples/Memorial Regional_ Surgical & Critical Care Twr Exp 2.xer.log`

The source XER header identified the file as a Primavera Cloud export:

```text
ERMHDR  15.2  2026-03-02  Project  ...  Primavera Cloud  USD  en
```

Procore Scheduling supports `.xer` imports, but Procore's current documentation notes that the latest cloud versions of P6 `.xer` files may not be supported. Relevant docs:

- [Procore Scheduling User Guide](https://support.procore.com/products/online/user-guide/project-level/scheduling)
- [Import a Project Schedule](https://support.procore.com/products/online/user-guide/project-level/scheduling/tutorials/import-a-project-schedule)
- [Why is my P6 XER or MS Project MPP file failing to import?](https://support.procore.com/products/online/user-guide/project-level/scheduling/faq-or-troubleshooting/why-is-my-p6-xer-or-ms-project-mpp-file-failing-to-import)

The failed Procore import log reported:

- Every `PROJWBS.guid` value was blank, which Procore surfaced as both:
  - `Non-nullable field 'guid' in table 'PROJWBS' is null or empty`
  - `Duplicate value for unique field guid in PROJWBS ...`
- Two tasks had blank `TASK.target_end_date` values:
  - `A11569` - `Purple Orchid Area Released`
  - `M1010` - `NTP`

The working fix was:

- Assign deterministic UUIDv5 GUIDs to every WBS row based on its hierarchical WBS path.
- Backfill the two blank milestone `target_end_date` values from available task dates.

## XER Parsing

XER files are tab-delimited text files organized by table sections:

- `%T` starts a table and names it.
- `%F` declares that table's fields.
- `%R` contains a record for the current table.

The extension should parse the file structurally instead of using ad hoc string replacement. At minimum, it needs to preserve all original lines and only rewrite fields that it intentionally repairs.

Required tables for the first version:

- `PROJWBS`
- `TASK`

Important `PROJWBS` fields:

- `wbs_id`
- `parent_wbs_id`
- `wbs_short_name`
- `wbs_name`
- `guid`

Important `TASK` fields:

- `task_code`
- `task_name`
- `task_type`
- `status_code`
- `target_start_date`
- `target_end_date`
- `act_start_date`
- `act_end_date`
- `early_start_date`
- `early_end_date`
- `late_start_date`
- `late_end_date`

## WBS Path GUID Algorithm

The extension should derive WBS GUIDs from the hierarchical WBS path so the same WBS path produces the same GUID across future exports, even when Primavera changes numeric `wbs_id` values.

Build the WBS hierarchy from `PROJWBS.parent_wbs_id`.

Define `WBS_PATH` as the period-separated Primavera-style path from the root WBS node to the current WBS node:

1. Use `wbs_short_name` for each path segment.
2. If `wbs_short_name` is blank, fall back to `wbs_name`.
3. If both are blank, fall back to `wbs_id`.
4. Trim each segment and collapse repeated whitespace.
5. Join segments with `.`.

Example:

```text
2586.C.MOB.B.1.A
```

Assign the WBS GUID with UUIDv5:

```ts
uuidv5("procore-xer-projwbs-path:" + wbsPath, uuidv5.URL)
```

The namespace prefix `procore-xer-projwbs-path:` should remain stable. Changing it would generate different GUIDs for the same WBS path.

The extension should fail with a clear validation message if two WBS rows generate the same `WBS_PATH`, because that would also generate duplicate GUIDs.

## Date Repair Algorithm

Milestone tasks may only include one side of the target date pair. A start milestone can have a `target_start_date` with a blank `target_end_date`; a finish milestone can have a `target_end_date` with a blank `target_start_date`. Procore may reject either case if it treats both fields as required.

For each `TASK` record, if `target_end_date` is blank, backfill it with the first available value from this ordered list:

1. `target_start_date`
2. `act_end_date`
3. `act_start_date`
4. `early_end_date`
5. `late_end_date`

For each `TASK` record, if `target_start_date` is blank, backfill it with the first available value from this ordered list:

1. `target_end_date`
2. `act_start_date`
3. `act_end_date`
4. `early_start_date`
5. `late_start_date`

This matched the MRH fix, where both blank planned-finish dates were completed milestones:

- `A11569` - `Purple Orchid Area Released`: `target_end_date` became `2025-11-03 08:00`.
- `M1010` - `NTP`: `target_end_date` became `2025-09-23 08:00`.

If no fallback date exists for either missing target date, the extension should leave the field unchanged and report the task as unresolved.

## Outputs

The extension should never overwrite the original XER.

Recommended output naming:

- Fixed XER: `<source base name>_fixed.xer`
- WBS map: `<source base name> - WBS Path GUID Map.tsv`

The WBS map should include:

```text
wbs_id  parent_wbs_id  wbs_path  guid  wbs_name
```

Example map row:

```text
1244738  1244721  2586.C.MOB.B.1.A  <uuidv5-from-period-separated-path>  Area A
```

## Raycast Extension Notes

Build this as a TypeScript Raycast extension.

Raycast is macOS-first, but the XER repair logic should be written as platform-neutral TypeScript so it can also be reused from a Windows-compatible CLI or helper later. Avoid macOS-only assumptions in the parser, file naming, line-ending handling, and path handling. Use Node path/file APIs instead of hard-coded `/` or `\` separators for filesystem paths. The internal `WBS_PATH` value should continue to use `.` as the stable logical Primavera WBS hierarchy separator on every operating system.

Expected scaffold shape:

```text
package.json
src/
assets/
tsconfig.json
```

Likely commands:

```bash
npm install && npm run dev
npm install
npm run dev
npm run lint
npm run build
```

Raycast documentation:

- [Getting Started](https://developers.raycast.com/basics/getting-started)
- [File Structure](https://developers.raycast.com/information/file-structure)
- [Create Your First Extension](https://developers.raycast.com/basics/create-your-first-extension)
- [Prepare an Extension for Store](https://developers.raycast.com/basics/prepare-an-extension-for-store)

## First-Version Feature Set

The first implementation should include one command:

- `Fix Procore XER Import`

Recommended command behavior:

1. Prompt for a source `.xer` file.
2. Prompt for an optional Procore `.log` file.
3. Parse and validate the XER.
4. Show a summary of detected issues:
   - Count of blank `PROJWBS.guid` values.
   - Count of duplicate `PROJWBS.guid` values.
   - Count of blank `TASK.target_start_date` values.
   - Count of blank `TASK.target_end_date` values.
   - Count of unresolved tasks after date fallback.
5. Generate the fixed XER and optional WBS map.
6. Show output paths and a copy-to-clipboard action.

Any later Windows-oriented entrypoint should reuse the same parsing and repair module as the Raycast command so both platforms generate identical GUIDs and output files.

## Acceptance Criteria

Using the MRH example inputs, the extension should be able to produce a fixed XER with:

- `572` `PROJWBS` rows.
- `0` blank `PROJWBS.guid` values.
- `0` duplicate `PROJWBS.guid` values.
- `327` `TASK` rows.
- `0` blank milestone `TASK.target_start_date` values after repair.
- `0` blank `TASK.target_end_date` values.

The WBS GUIDs must be reproducible from the same WBS paths using:

```ts
uuidv5("procore-xer-projwbs-path:" + wbsPath, uuidv5.URL)
```

The extension should make no claim that it can fix every Procore Scheduling import failure. It should clearly report when an XER may still fail because of unsupported Primavera Cloud XER format/version issues.
