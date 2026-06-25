import { LaunchProps } from "@raycast/api";
import { quickAdd } from "./busycal-quick-add";

/**
 * Raycast command entry point for natural-language BusyCal event creation.
 *
 * - Parameter props: Raycast command arguments containing the quick-entry text.
 */
export default async function QuickAddEventCommand(
  props: LaunchProps<{ arguments: Arguments.QuickAddEvent }>,
) {
  await quickAdd("event", props.arguments.inputText);
}
