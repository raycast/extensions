import { LaunchProps } from "@raycast/api";
import { quickAdd } from "./busycal-quick-add";

/**
 * Raycast command entry point for natural-language BusyCal task creation.
 *
 * - Parameter props: Raycast command arguments containing the quick-entry text.
 */
export default async function QuickAddTaskCommand(
  props: LaunchProps<{ arguments: Arguments.QuickAddTask }>,
) {
  await quickAdd("task", props.arguments.inputText);
}
