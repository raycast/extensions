/**
 * Build the menu bar title string from toggled display parts.
 *
 * Separator logic:
 * - Flight number + status joined with ": "  → "DL389: Cruising"
 * - ETA appended with " • "                  → "DL389: Cruising • ~2h 15m"
 * - Missing middle parts degrade naturally    → "DL389 • ~2h 15m", "Cruising", "~2h 15m"
 * - All text off → empty string (caller should force icon on)
 */
export function buildMenuBarTitle(
  displayNumber: string,
  statusText: string | null,
  etaText: string | null,
  showFlightNumber: boolean,
  showStatus: boolean,
  showEta: boolean,
): string {
  const parts: string[] = [];

  if (showFlightNumber) {
    parts.push(displayNumber);
  }

  if (showStatus && statusText) {
    if (parts.length > 0) {
      // Append status to the last element with ": "
      parts[parts.length - 1] += `: ${statusText}`;
    } else {
      parts.push(statusText);
    }
  }

  if (showEta && etaText) {
    parts.push(etaText);
  }

  return parts.join(" • ");
}
