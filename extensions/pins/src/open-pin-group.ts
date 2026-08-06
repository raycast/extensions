import { LaunchProps, showHUD } from "@raycast/api";

import { openPinGroup } from "./lib/openPinGroup";

export default async function OpenPinGroupCommand(props: LaunchProps<{ arguments: Arguments.OpenPinGroup }>) {
  const result = await openPinGroup(props.arguments.groupId);

  if (!result.group) {
    await showHUD("Pin group not found");
    return;
  }

  if (result.opened == 0) {
    await showHUD(`“${result.group.name}” has no pins`);
    return;
  }

  await showHUD(`Opened ${result.opened} pin${result.opened == 1 ? "" : "s"} from “${result.group.name}”`);
}
