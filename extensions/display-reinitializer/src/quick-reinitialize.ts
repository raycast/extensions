import { showToast, Toast, LaunchProps } from "@raycast/api";
import {
  getAllDisplays,
  reinitializeDisplay,
} from "swift:../swift/display-helper";

interface Display {
  id: number;
  name: string;
  uuid: string;
  isMain: boolean;
  isBuiltIn: boolean;
  width: number;
  height: number;
  availableMethods: string[];
  hasMultipleRefreshRates: boolean;
  recommendedMethod: string;
}

interface QuickReinitializeArguments {
  displayName: string;
}

export default async function Command(
  props: LaunchProps<{ arguments: QuickReinitializeArguments }>,
) {
  const { displayName } = props.arguments;

  if (!displayName || displayName.trim() === "") {
    await showToast({
      style: Toast.Style.Failure,
      title: "No display name provided",
      message: "Please specify a display name",
    });
    return;
  }

  const searchTerm = displayName.trim().toLowerCase();

  try {
    const displays: Display[] = await getAllDisplays();

    if (displays.length === 0) {
      await showToast({
        style: Toast.Style.Failure,
        title: "No displays found",
        message: "Could not detect any connected displays",
      });
      return;
    }

    // Find matching display with priority: exact match > partial match > ID match
    const matchedDisplay = findMatchingDisplay(displays, searchTerm);

    if (!matchedDisplay) {
      const availableNames = displays.map((d) => d.name).join(", ");
      await showToast({
        style: Toast.Style.Failure,
        title: "Display not found",
        message: `No match for "${displayName}". Available: ${availableNames}`,
      });
      return;
    }

    // Show animated toast while reinitializing
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: `Reinitializing ${matchedDisplay.name}...`,
      message: "Using auto-select method",
    });

    try {
      await reinitializeDisplay(matchedDisplay.id, "auto");
      toast.style = Toast.Style.Success;
      toast.title = "Display Reinitialized";
      toast.message = matchedDisplay.name;
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Reinitialization Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to get displays",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

function findMatchingDisplay(
  displays: Display[],
  searchTerm: string,
): Display | null {
  // 1. Exact match (case-insensitive)
  const exactMatch = displays.find((d) => d.name.toLowerCase() === searchTerm);
  if (exactMatch) return exactMatch;

  // 2. Check if searchTerm is a number (display ID)
  const searchAsNumber = parseInt(searchTerm, 10);
  if (!isNaN(searchAsNumber)) {
    const idMatch = displays.find((d) => d.id === searchAsNumber);
    if (idMatch) return idMatch;
  }

  // 3. Partial/substring match (case-insensitive)
  const partialMatches = displays.filter((d) =>
    d.name.toLowerCase().includes(searchTerm),
  );

  // If exactly one partial match, use it
  if (partialMatches.length === 1) {
    return partialMatches[0];
  }

  // 4. Also check if display name contains the search term as a word boundary
  // e.g., "LG" should match "LG 27UK850" but we already handle this above

  // If multiple matches or no matches, return null
  // (User needs to be more specific)
  return null;
}
