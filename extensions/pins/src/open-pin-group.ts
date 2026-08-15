import { LaunchProps, showHUD } from "@raycast/api";

import { openPinGroup } from "./lib/openPinGroup";

/**
 * Raycast command for opening every direct member pin of a group without showing a view.
 * @param props The command launch arguments.
 */
export default async function OpenPinGroupCommand(props: LaunchProps<{ arguments: Arguments.OpenPinGroup }>) {
  const result = await openPinGroup(props.arguments.groupId);

  if (!result.group) {
    await showHUD("Pin group not found");
    return;
  }

  if (result.total == 0) {
    await showHUD(`“${result.group.name}” has no pins`);
    return;
  }

  if (result.skippedDisabled == result.total) {
    await showHUD(`All ${result.total} pin${result.total == 1 ? " is" : "s are"} disabled in “${result.group.name}”`);
    return;
  }

  if (result.opened == 0) {
    const details = [
      result.failed > 0 ? `${result.failed} failed` : undefined,
      result.skippedDisabled > 0 ? `${result.skippedDisabled} disabled` : undefined,
    ].filter(Boolean);
    await showHUD(`No pins opened from “${result.group.name}”${details.length > 0 ? ` (${details.join(", ")})` : ""}`);
    return;
  }

  if (result.failed > 0 || result.skippedDisabled > 0) {
    const details = [
      result.failed > 0 ? `${result.failed} failed` : undefined,
      result.skippedDisabled > 0 ? `${result.skippedDisabled} disabled` : undefined,
    ].filter(Boolean);
    await showHUD(`Opened ${result.opened}/${result.total} pins from “${result.group.name}” (${details.join(", ")})`);
    return;
  }

  await showHUD(`Opened ${result.opened} pin${result.opened == 1 ? "" : "s"} from “${result.group.name}”`);
}
