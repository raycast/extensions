import { quickAdd } from "./busycal-quick-add";
import { QuickAddArguments } from "./types";

/**
 * Raycast command entry point for natural-language BusyCal event creation.
 *
 * - Parameter props: Raycast command arguments containing the quick-entry text.
 */
export default async function QuickAddEventCommand(props: {
  arguments: QuickAddArguments;
}) {
  await quickAdd("event", props.arguments.inputText);
}
