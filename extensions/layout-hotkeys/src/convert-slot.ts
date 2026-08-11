import { showHUD } from "@raycast/api";
import { applyConversion, readSelectionAndConvert } from "./lib/convert";
import { Slot, resolveSlot } from "./lib/input-source";

/**
 * Shared body for the four convert commands. Uses the same slot assignments as
 * the Switch to Layout commands, so Layout 2 means the same language in both.
 */
export async function convertToSlot(slot: Slot) {
  const outcome = await readSelectionAndConvert();
  if (!outcome.ok) {
    await showHUD(outcome.message);
    return;
  }

  const targetId = await resolveSlot(slot);
  if (!targetId) {
    await showHUD(`Layout ${slot} is unassigned`);
    return;
  }

  const conversion = outcome.selection.result.conversions.find(
    (candidate) => candidate.layoutId === targetId,
  );
  if (!conversion) {
    await showHUD(
      `Layout ${slot} does not expose keyboard layout data, so text cannot be converted into it`,
    );
    return;
  }

  if (conversion.text === outcome.selection.text) {
    await showHUD(`Already ${conversion.layoutName}`);
    return;
  }

  await applyConversion(
    conversion.text,
    conversion.layoutId,
    outcome.selection,
  );
}
