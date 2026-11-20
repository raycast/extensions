// The two macOS commands the extension runs itself, as [executable, argv]: never a shell
// string, and any text rides as its own argv item, so the tests can check both.

/** `open -t`: the default text editor, not the app that owns the extension (a .md would open in a previewer). */
export function openInEditorArgv(target: string): [string, string[]] {
  return ["/usr/bin/open", ["-t", target]];
}

/**
 * Same notification as assets/fabric-bg.sh posts (keep the two in sync); the text is read from
 * argv, never interpolated. `--` ends osascript's options: without it, text starting with `-e`
 * is parsed as more AppleScript (probed 2026-10-18).
 */
export function notifyArgv(text: string): [string, string[]] {
  return [
    "/usr/bin/osascript",
    [
      "-e",
      "on run argv",
      "-e",
      'display notification (item 1 of argv) with title "Fabric"',
      "-e",
      "end run",
      "--",
      text,
    ],
  ];
}
