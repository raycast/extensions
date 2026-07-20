export const SUPPORTED_OPERATIONS = ["Mount", "Copy", "Sync", "Move", "Delete", "Purge"];

const MountDescription = `
Expose any supported remote as a live filesystem so you can browse, open, or edit cloud files directly from your desktop or server without manual transfers.

Ideal when you want apps to work against cloud storage as if it were a local disk, whether for quick previews, media playback, or lightweight editing sessions.

Works across Linux, macOS, and Windows using FUSE or WinFsp so you can keep cloud drives continuously available or mount them on demand.
`;

const CopyDescription = `
Replicate the contents of a source path to a destination without touching existing files that already match on size and time, keeping the origin intact.

Perfect for one-way backups or staging data where you want dependable duplication while preserving anything already present on the target side.

When the backend supports it, metadata like modtimes are preserved so the clone stays trustworthy for later integrity checks or incremental syncs.
`;

const CopyFileDescription = `
Transfer a single object from one remote or path to another, preserving the source file once the destination copy completes.

Use it when you just need to duplicate or rename a specific asset without syncing entire directories or re-uploading everything else.

Works equally well for local-to-cloud, cloud-to-local, or cross-provider hops, which keeps ad-hoc promotions and patch copy jobs fast.
`;

const CopyUrlDescription = `
Fetch the contents of an HTTP(S) URL and stream it straight into your remote, skipping any temporary disk storage on the local machine.

Handy for dropping externally hosted artifacts into cloud buckets or collecting web-delivered assets without first downloading them yourself.

It’s ideal for piping release binaries, backups, or signed assets directly into storage the moment they’re published elsewhere.
`;

const SyncDescription = `
Make a destination mirror its source by copying new or changed files and removing anything that no longer exists upstream, so both sides stay identical.

Best when you need reliable deployments or backups where the target must exactly match the current state of the source tree after each run.

Because stale files are purged, it’s suited to scheduled jobs that must leave no drift—like production mirrors, CDN origins, or DR replicas.
`;

const MoveDescription = `
Relocate everything from a source path to a destination, copying data first when necessary and then removing it from the origin once safely transferred.

Useful for reorganizing storage, clearing ingestion queues, or handing off finalized files to long-term locations without leaving duplicates behind.

Freeing the source immediately helps reclaim space and keeps workflows that rely on “drop folders” or handoff directories tidy.
`;

const MoveFileDescription = `
Shift an individual file between remotes or folders, ensuring the destination receives the object before deleting it from the source.

Great for renaming, promoting finished assets, or tidying single large files when a full directory move would be overkill.

It’s the simplest way to atomically retitle or relocate a crucial artifact without risking broader directory changes.
`;

const DeleteDescription = `
Remove files within a path according to your include or exclude filters while leaving the directory structure itself in place.

Choose this when you need selective cleanup—like trimming large archives or rolling off old snapshots—without nuking entire folders.

Pair it with predictable naming to prune logs, staging dumps, or cache files on a cadence while preserving the scaffolding for future runs.
`;

const DeleteFileDescription = `
Target a single file on a remote and remove it outright, ignoring any filtering rules that might otherwise skip it.

Ideal for quick fixes when a misnamed upload, corrupted artifact, or sensitive document needs to disappear immediately.

Perfect for CI/CD cleanup steps or emergency removals where precision matters and collateral deletes are unacceptable.
`;

const PurgeDescription = `
Completely delete a directory or bucket along with every object beneath it, leaving nothing behind on the destination.

Reach for this when you want a clean slate—such as resetting test environments or decommissioning stale datasets—in one decisive operation.

Use it cautiously when retiring environments or wiping buckets before repurposing them for fresh projects.
`;

export const OPERATION_DESCRIPTIONS = {
  Mount: MountDescription,
  Copy: CopyDescription,
  CopyFile: CopyFileDescription,
  CopyUrl: CopyUrlDescription,
  Sync: SyncDescription,
  Move: MoveDescription,
  MoveFile: MoveFileDescription,
  Delete: DeleteDescription,
  DeleteFile: DeleteFileDescription,
  Purge: PurgeDescription,
} as const;
