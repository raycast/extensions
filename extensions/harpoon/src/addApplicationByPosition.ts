import { LaunchProps, showHUD } from "@raycast/api";
import addApplication from "./addApplication";

export default async function addApplicationByPosition(
  props: LaunchProps<{ arguments: Arguments.AddApplicationByPosition }>
) {
  const position = parseInt(props.arguments.position, 10);

  if (isNaN(position)) {
    return await showHUD("Position must be a number");
  }

  if (position < 1) {
    return await showHUD("Position must be greater than 0");
  }

  await addApplication(position);
}
