import { openMemoryMachineUrl, showMemoryMachineError } from "./lib/installed-app";
import { LaunchProps, Toast, showToast } from "@raycast/api";
import { buildMemoryMachineSearchUrl } from "./lib/memory-machine";

/**
 * Opens Memory Machine with the user's text as a literal keyword search with no AI
 * interpretation. The argument is URL-encoded and passed straight to
 * `memorymachine://search?term=...`.
 *
 * @example
 * // User types: "design review notes"
 * // Opens: memorymachine://search?term=design+review+notes
 *
 * @example
 * // User submits empty argument
 * // Opens: memorymachine://search
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.SearchOrbit }>) {
  const query = (props.arguments.query ?? props.fallbackText ?? "").trim();
  const url = buildMemoryMachineSearchUrl(query);

  try {
    await openMemoryMachineUrl(url);
    await showToast({
      style: Toast.Style.Success,
      title: "Opened Search",
      message: query || undefined,
    });
  } catch (error) {
    await showMemoryMachineError(error, "Could not open Memory Machine Search", () => Command(props));
  }
}
