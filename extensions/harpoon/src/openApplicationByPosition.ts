import { LaunchProps, closeMainWindow, open, showHUD } from "@raycast/api";
import getItemByIndex from "./helpers/getItemByIndex";

export default async function openApplicationByPosition(
  props: LaunchProps<{ arguments: Arguments.OpenApplicationByPosition }>
) {
  const position = parseInt(props.arguments.position, 10);

  if (isNaN(position)) {
    return await showHUD("Position must be a number");
  }

  if (position < 1) {
    return await showHUD("Position must be greater than 0");
  }

  const item = await getItemByIndex(position - 1).catch(async () => {
    await showHUD(`No application found at position ${position}`);
  });

  if (item) {
    open(item.path, item.name);
  }

  await closeMainWindow();
}
