import { open } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

interface Arguments {
  query: string;
  module?: string;
}

// Prevent multiple simultaneous executions
let isExecuting = false;

export default async function Command(props: { arguments?: Arguments }) {
  // Prevent multiple executions
  if (isExecuting) {
    return;
  }

  isExecuting = true;

  try {
    const args = props.arguments;

    const searchQuery = args?.query?.trim();
    const module = args?.module?.trim();

    if (!searchQuery) {
      await showFailureToast("Please provide a search term");
      return;
    }

    const url = module
      ? `accord://search/${encodeURIComponent(module)}?${encodeURIComponent(searchQuery)}`
      : `accord://search/${encodeURIComponent(searchQuery)}`;

    await open(url);
  } catch (error) {
    console.error("Failed to open Accordance search:", error);
    await showFailureToast("Failed to open Accordance search");
  } finally {
    // Reset the flag after a short delay to allow subsequent calls
    setTimeout(() => {
      isExecuting = false;
    }, 1000);
  }
}
