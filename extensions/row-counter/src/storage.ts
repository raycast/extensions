import {
  LaunchType,
  LocalStorage,
  launchCommand,
  updateCommandMetadata,
} from "@raycast/api";

const KEY = "rows";

export async function getRows(): Promise<number> {
  const value = await LocalStorage.getItem<number>(KEY);
  return typeof value === "number" ? value : 0;
}

export async function setRows(rows: number): Promise<void> {
  await LocalStorage.setItem(KEY, rows);
}

/** Shows the current row in the calling command's subtitle, or restores the default at 0. */
export async function updateRowSubtitle(rows: number): Promise<void> {
  await updateCommandMetadata({ subtitle: rows > 0 ? `Row ${rows}` : null });
}

/** Asks Add Row to refresh its subtitle after another command changed the count. */
export async function refreshAddRowSubtitle(): Promise<void> {
  try {
    await launchCommand({
      name: "add-row",
      type: LaunchType.Background,
      context: { refreshOnly: true },
    });
  } catch {
    // Add Row is disabled, so there is no subtitle to refresh.
  }
}
