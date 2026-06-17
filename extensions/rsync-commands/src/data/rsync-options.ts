export type EntryOptionData = {
  name: string
  description: string
  param?: string
}

export default [
  {
    name: "8-bit-output",
    description: "Leave high-bit chars unescaped in output.",
  },
  {
    name: "acls",
    description: "Preserve ACLs (implies -p).",
  },
  {
    name: "address",
    param: "address",
    description: "Bind address for outgoing socket to daemon.",
  },
  {
    name: "append",
    description: "Append data onto shorter files.",
  },
  {
    name: "append-verify",
    description: "--append w/old data in file checksum.",
  },
  {
    name: "archive",
    description: "Archive mode; equals -rlptgoD (no -H,-A,-X).",
  },
  {
    name: "backup",
    description: "Make backups (see --suffix & --backup-dir).",
  },
  {
    name: "backup-dir",
    param: "dir",
    description: "Make backups into hierarchy based in DIR.",
  },
  {
    name: "block-size",
    param: "size",
    description: "Force a fixed checksum block-size.",
  },
  {
    name: "blocking-io",
    description: "Use blocking I/O for the remote shell.",
  },
  {
    name: "bwlimit",
    param: "kbps",
    description: "Limit I/O bandwidth; KBytes per second.",
  },
  {
    name: "checksum",
    description: "Skip based on checksum, not mod-time & size.",
  },
  {
    name: "checksum-seed",
    param: "num",
    description: "Set block/file checksum seed (advanced).",
  },
  {
    name: "chmod",
    param: "chmod",
    description: "Affect file and/or directory permissions.",
  },
  {
    name: "compare-dest",
    param: "dir",
    description: "Also compare received files relative to DIR.",
  },
  {
    name: "compress",
    description: "Compress file data during the transfer.",
  },
  {
    name: "compress-level",
    param: "num",
    description: "Explicitly set compression level.",
  },
  {
    name: "config",
    param: "file",
    description: "Specify alternate rsyncd.conf file.",
  },
  {
    name: "contimeout",
    param: "seconds",
    description: "Set daemon connection timeout in seconds.",
  },
  {
    name: "copy-dest",
    param: "dir",
    description: "... and include copies of unchanged files.",
  },
  {
    name: "copy-dirlinks",
    description: "Transform symlink to dir into referent dir.",
  },
  {
    name: "copy-links",
    description: "Transform symlink into referent file/dir.",
  },
  {
    name: "copy-unsafe-links",
    description: 'Only "unsafe" symlinks are transformed.',
  },
  {
    name: "cvs-exclude",
    description: "Auto-ignore files in the same way CVS does.",
  },
  {
    name: "daemon",
    description: "Run as an rsync daemon.",
  },
  {
    name: "del",
    description: "An alias for --delete-during.",
  },
  {
    name: "delay-updates",
    description: "Put all updated files into place at end.",
  },
  {
    name: "delete",
    description: "Delete extraneous files from dest dirs.",
  },
  {
    name: "delete-after",
    description: "Receiver deletes after transfer, not before.",
  },
  {
    name: "delete-before",
    description: "Receiver deletes before transfer (default).",
  },
  {
    name: "delete-delay",
    description: "Find deletions during, delete after.",
  },
  {
    name: "delete-during",
    description: "Receiver deletes during xfer, not before.",
  },
  {
    name: "delete-excluded",
    description: "Also delete excluded files from dest dirs.",
  },
  {
    name: "devices",
    description: "Preserve device files (super-user only).",
  },
  {
    name: "dirs",
    description: "Transfer directories without recursing.",
  },
  {
    name: "dry-run",
    description: "Perform a trial run with no changes made.",
  },
  {
    name: "exclude",
    param: "pattern",
    description: "Exclude files matching PATTERN.",
  },
  {
    name: "exclude-from",
    param: "file",
    description: "Read exclude patterns from FILE.",
  },
  {
    name: "executability",
    description: "Preserve executability.",
  },
  {
    name: "existing",
    description: "Skip creating new files on receiver.",
  },
  {
    name: "fake-super",
    description: "Store/recover privileged attrs using xattrs.",
  },
  {
    name: "files-from",
    param: "file",
    description: "Read list of source-file names from FILE.",
  },
  {
    name: "filter",
    param: "rule",
    description: "Add a file-filtering RULE.",
  },
  {
    name: "force",
    description: "Force deletion of dirs even if not empty.",
  },
  {
    name: "from0",
    description: "All *from/filter files are delimited by 0s.",
  },
  {
    name: "fuzzy",
    description: "Find similar file for basis if no dest file.",
  },
  {
    name: "group",
    description: "Preserve group.",
  },
  {
    name: "hard-links",
    description: "Preserve hard links.",
  },
  {
    name: "human-readable",
    description: "Output numbers in a human-readable format.",
  },
  {
    name: "iconv",
    param: "convert_spec",
    description: "Request charset conversion of filenames.",
  },
  {
    name: "ignore-errors",
    description: "Delete even if there are I/O errors.",
  },
  {
    name: "ignore-existing",
    description: "Skip updating files that exist on receiver.",
  },
  {
    name: "ignore-times",
    description: "Don't skip files that match size and time.",
  },
  {
    name: "include",
    param: "pattern",
    description: "Don't exclude files matching PATTERN.",
  },
  {
    name: "include-from",
    param: "file",
    description: "Read include patterns from FILE.",
  },
  {
    name: "inplace",
    description: "Update destination files in-place.",
  },
  {
    name: "ipv4",
    description: "Prefer IPv4.",
  },
  {
    name: "ipv6",
    description: "Prefer IPv6.",
  },
  {
    name: "itemize-changes",
    description: "Output a change-summary for all updates.",
  },
  {
    name: "keep-dirlinks",
    description: "Treat symlinked dir on receiver as dir.",
  },
  {
    name: "link-dest",
    param: "dir",
    description: "Hardlink to files in DIR when unchanged.",
  },
  {
    name: "links",
    description: "Copy symlinks as symlinks.",
  },
  {
    name: "list-only",
    description: "List the files instead of copying them.",
  },
  {
    name: "log-file",
    param: "file",
    description: "Log what we're doing to the specified FILE.",
  },
  {
    name: "log-file-format",
    param: "fmt",
    description: "Log updates using the specified FMT.",
  },
  {
    name: "max-delete",
    param: "num",
    description: "Don't delete more than NUM files.",
  },
  {
    name: "max-size",
    param: "size",
    description: "Don't transfer any file larger than SIZE.",
  },
  {
    name: "min-size",
    param: "size",
    description: "Don't transfer any file smaller than SIZE.",
  },
  {
    name: "modify-window",
    param: "num",
    description: "Compare mod-times with reduced accuracy.",
  },
  {
    name: "no-detach",
    description: "Do not detach from the parent.",
  },
  {
    name: "no-implied-dirs",
    description: "Don't send implied dirs with --relative.",
  },
  {
    name: "no-motd",
    description: "Suppress daemon-mode MOTD (see caveat).",
  },
  {
    name: "numeric-ids",
    description: "Don't map uid/gid values by user/group name.",
  },
  {
    name: "omit-dir-times",
    description: "Omit directories from --times.",
  },
  {
    name: "one-file-system",
    description: "Don't cross filesystem boundaries.",
  },
  {
    name: "only-write-batch",
    param: "file",
    description: "Like --write-batch but w/o updating dest.",
  },
  {
    name: "out-format",
    param: "format",
    description: "Output updates using the specified FORMAT.",
  },
  {
    name: "owner",
    description: "Preserve owner (super-user only).",
  },
  {
    name: "partial",
    description: "Keep partially transferred files.",
  },
  {
    name: "partial-dir",
    param: "dir",
    description: "Put a partially transferred file into DIR.",
  },
  {
    name: "password-file",
    param: "file",
    description: "Read daemon-access password from FILE.",
  },
  {
    name: "perms",
    description: "Preserve permissions.",
  },
  {
    name: "port",
    param: "port",
    description: "Specify double-colon alternate port number.",
  },
  {
    name: "progress",
    description: "Show progress during transfer.",
  },
  {
    name: "protect-args",
    description: "No space-splitting; wildcard chars only.",
  },
  {
    name: "protocol",
    param: "num",
    description: "Force an older protocol version to be used.",
  },
  {
    name: "prune-empty-dirs",
    description: "Prune empty directory chains from file-list.",
  },
  {
    name: "quiet",
    description: "Suppress non-error messages.",
  },
  {
    name: "read-batch",
    param: "file",
    description: "Read a batched update from FILE.",
  },
  {
    name: "recursive",
    description: "Recurse into directories.",
  },
  {
    name: "relative",
    description: "Use relative path names.",
  },
  {
    name: "remove-source-files",
    description: "Sender removes synchronized files (non-dir).",
  },
  {
    name: "rsh",
    param: "command",
    description: "Specify the remote shell to use.",
  },
  {
    name: "rsync-path",
    param: "program",
    description: "Specify the rsync to run on remote machine.",
  },
  {
    name: "safe-links",
    description: "Ignore symlinks that point outside the tree.",
  },
  {
    name: "size-only",
    description: "Skip files that match in size.",
  },
  {
    name: "skip-compress",
    param: "list",
    description: "Skip compressing files with suffix in LIST.",
  },
  {
    name: "sockopts",
    param: "options",
    description: "Specify custom TCP options.",
  },
  {
    name: "sparse",
    description: "Handle sparse files efficiently.",
  },
  {
    name: "specials",
    description: "Preserve special files.",
  },
  {
    name: "stats",
    description: "Give some file-transfer stats.",
  },
  {
    name: "suffix",
    param: "suffix",
    description: "Backup suffix (default ~ w/o --backup-dir).",
  },
  {
    name: "super",
    description: "Receiver attempts super-user activities.",
  },
  {
    name: "temp-dir",
    param: "dir",
    description: "Create temporary files in directory DIR.",
  },
  {
    name: "timeout",
    param: "seconds",
    description: "Set I/O timeout in seconds.",
  },
  {
    name: "times",
    description: "Preserve modification times.",
  },
  {
    name: "update",
    description: "Skip files that are newer on the receiver.",
  },
  {
    name: "verbose",
    description: "Increase verbosity.",
  },
  {
    name: "whole-file",
    description: "Copy files whole (w/o delta-xfer algorithm).",
  },
  {
    name: "write-batch",
    param: "file",
    description: "Write a batched update to FILE.",
  },
  {
    name: "xattrs",
    description: "Preserve extended attributes.",
  },
] as EntryOptionData[]
