import { LaunchProps, Toast, open, showToast } from "@raycast/api";
import { buildOrbitHomeUrl } from "./lib/orbit";

/**
 * Opens Orbit with the user's text as a literal keyword search with no AI
 * interpretation. The argument is URL-encoded and passed straight to
 * `orbit://home?search=...`.
 *
 * @example
 * // User types: "design review notes"
 * // Opens: orbit://home?search=design+review+notes
 *
 * @example
 * // User submits empty argument
 * // Opens: orbit://home
 */
export default async function Command(props: LaunchProps<{ arguments: Arguments.SearchOrbit }>) {
  const query = (props.arguments.query ?? props.fallbackText ?? "").trim();
  const url = buildOrbitHomeUrl(query);

  try {
    await open(url);
    await showToast({
      style: Toast.Style.Success,
      title: query ? "Opened Search" : "Opened Home",
      message: query || undefined,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not open Orbit Search",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
