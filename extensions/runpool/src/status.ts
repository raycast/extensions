import { updateCommandMetadata } from "@raycast/api";
import { findRunpool, getStatus, summarise } from "./lib/runpool";

/**
 * Keep a live summary in this command's subtitle, refreshed in the background.
 *
 * This is the replacement for a menu-bar item, and it is a deliberate choice
 * rather than a limitation: the readout appears in Raycast's root search where
 * you already are, and adds nothing to the macOS menu bar.
 *
 * Uses `--local`, which makes no network call. A GitHub request every minute
 * would be thousands a day and would make the readout fail whenever the
 * connection did, which defeats the point of a passive indicator.
 */
export default async function Command() {
  if (!findRunpool()) {
    await updateCommandMetadata({ subtitle: "runpool not installed" });
    return;
  }

  try {
    const status = await getStatus({ local: true });
    await updateCommandMetadata({ subtitle: summarise(status) });
  } catch {
    // Deliberately quiet. This runs unattended every minute, so a transient
    // failure must not raise a toast over whatever the user is actually doing.
    await updateCommandMetadata({ subtitle: "Status unavailable" });
  }
}
