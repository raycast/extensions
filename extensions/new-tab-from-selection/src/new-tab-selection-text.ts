import { LaunchProps } from "@raycast/api";
import { openForText, readSelection } from "./run";

export default async function main(props: LaunchProps<{ arguments: Arguments.NewTabSelectionText }>) {
  const selection = await readSelection();
  const typed = props.arguments.query ?? "";

  // Selection first, typed terms appended: "raycast api" + "getSelectedText".
  // Either part may be empty; openForText normalizes whitespace and no-ops when
  // the combined text is empty.
  const combined = [selection, typed]
    .map((s) => s.trim())
    .filter(Boolean)
    .join(" ");
  await openForText(combined, "Nothing to search");
}
