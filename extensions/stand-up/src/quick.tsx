import { LaunchProps, showHUD } from "@raycast/api";
import { addEntry } from "./api";

export default async function Command(
  props: LaunchProps<{
    arguments: Arguments.Quick;
  }>,
) {
  const { note } = props.arguments;

  await addEntry({
    notes: note,
  });

  return showHUD("Note added");
}
