import { quickAdd } from "./busycal-quick-add";
import { QuickAddArguments } from "./types";

/**
 * Raycast command entry point for natural-language BusyCal task creation.
 *
 * - Parameter props: Raycast command arguments containing the quick-entry text.
 */
export default async function QuickAddTaskCommand(props: {
  arguments: QuickAddArguments;
}) {
  await quickAdd("task", props.arguments.inputText);
}
