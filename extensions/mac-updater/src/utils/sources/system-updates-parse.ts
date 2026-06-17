// Pure parser for `softwareupdate -l` output. Kept free of any @raycast/api
// import so it can be unit-tested in plain Node.

export interface SystemUpdate {
  label: string;
  title: string;
  version?: string;
  sizeMB?: number;
  recommended: boolean;
  restart: boolean;
}

/**
 * Parse `softwareupdate -l` output. Each update is two lines:
 *   * Label: macOS Sequoia 15.6.1-24G90
 *   \tTitle: macOS Sequoia, Version: 15.6.1, Size: 7340032KiB, Recommended: YES, Action: restart,
 * (older macOS uses "Size: 1234567K").
 */
export function parseSoftwareUpdateList(output: string): SystemUpdate[] {
  const updates: SystemUpdate[] = [];
  const lines = output.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const label = lines[i].match(/^\s*\*\s*Label:\s*(.+?)\s*$/)?.[1];
    if (!label) continue;
    const detail = lines[i + 1] ?? "";
    const title = detail.match(/Title:\s*([^,]+)/)?.[1]?.trim() ?? label;
    const version = detail.match(/Version:\s*([^,]+)/)?.[1]?.trim();
    // Size is reported as "1234567K", "1234567KB", or "1234567KiB".
    const sizeKiB = detail.match(/Size:\s*(\d+)\s*Ki?B?/i)?.[1];
    updates.push({
      label,
      title,
      version,
      sizeMB: sizeKiB ? Math.round(parseInt(sizeKiB, 10) / 1024) : undefined,
      recommended: /Recommended:\s*YES/i.test(detail),
      restart: /Action:\s*restart|restart/i.test(detail),
    });
  }
  return updates;
}
