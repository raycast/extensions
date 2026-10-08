# R2 Uploader Changelog

## [Browse R2 Files] - 2026-07-23

- Add a **Browse R2 Files** command to navigate your bucket's folders, preview files (inline image preview via a short-lived signed URL, works even on private buckets), copy their link, and delete individual files with a confirmation prompt
- Support deleting an entire folder from Browse R2 Files, which counts every file under it (including subfolders) and confirms the exact count before permanently deleting them
- Fix Browse R2 Files silently truncating folders with more than 1,000 immediate entries, now following pagination to list everything
- Fix folder deletion reporting full success even if some files failed to delete (e.g. a permissions/retention issue); it now surfaces which files couldn't be removed
- Fix the `/`/`root` folder reset ignoring a configured **Upload Path Prefix** and forcing the bucket root instead of falling back to it
- Fix copied URLs and Markdown/HTML links breaking for keys or filenames containing spaces, `#`, `?`, `]`, `"`, or other special characters
- If you had **Generate Markdown** enabled before this update, it's replaced by the new **Link Format** preference (defaulting to Plain URL) — re-select "Markdown" there if you want to keep that behavior

## [Custom Upload Path & Link Format] - 2026-07-23

- Add **Upload Path Prefix** preference to store uploads under a folder instead of the bucket root, with the same date/name placeholders as the filename format (closes [#1](https://github.com/mazaoshe/Raycast-UploadImageR2/issues/1))
- Add an optional **Folder** argument to set the upload folder per invocation; it's "sticky" across uploads (persisted until changed or reset with `/` or `root`) and reflected live in the command's subtitle so the active folder is always visible before uploading
- Replace the **Generate Markdown** checkbox with a **Link Format** dropdown (Plain URL / Markdown / HTML)
- Fix `{year}`/`{day}` filename placeholders, which used invalid dayjs format tokens and produced incorrect output

## [Initial Version] - 2025-09-04