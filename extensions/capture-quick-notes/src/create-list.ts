import { closeMainWindow, LaunchProps, showHUD } from "@raycast/api";
import { createList, errorMessage } from "./capture-cli";

export default async function Command(
  props: LaunchProps<{ arguments: Arguments.CreateList }>,
) {
  await closeMainWindow({ clearRootSearch: true });
  try {
    const list = await createList(props.arguments.name);
    await showHUD(`Created list "${list.name}"`);
  } catch (error) {
    await showHUD(`Could not create list: ${errorMessage(error)}`);
  }
}
