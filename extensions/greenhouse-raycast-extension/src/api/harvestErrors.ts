import { HarvestError } from "./harvest";

export type HarvestErrorContext = "jobs" | "pipeline";

export interface HarvestErrorDisplay {
  title: string;
  description: string;
  toastTitle?: string;
  toastMessage?: string;
}

export function getHarvestErrorDisplay(
  error: unknown,
  context: HarvestErrorContext,
): HarvestErrorDisplay {
  if (error instanceof HarvestError) {
    if (error.status === 401 || error.status === 403) {
      return {
        title: "Harvest authentication failed",
        description: "Check your Harvest API key in Raycast preferences.",
        toastTitle: "Harvest authentication failed",
        toastMessage: "Update your API key in Raycast preferences.",
      };
    }

    if (error.status === 429) {
      return {
        title: "Harvest rate limit reached",
        description: "Wait a moment and try again.",
        toastTitle: "Harvest rate limit reached",
        toastMessage: "Please wait a moment and try again.",
      };
    }

    return {
      title: `Harvest API error (${error.status})`,
      description: `Unable to load ${context}. Please try again.`,
    };
  }

  return {
    title: `Unable to load ${context}`,
    description: "Please try again.",
  };
}
