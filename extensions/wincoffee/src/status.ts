import { LaunchProps, updateCommandMetadata } from "@raycast/api";
import { getCaffeinateState } from "./utils";

interface StatusContext {
  caffeinated?: boolean;
}

export default async function Command(
  props: LaunchProps<{ launchContext: StatusContext }>,
) {
  try {
    // Prefer the explicit context passed via launchCommand (most reliable)
    const contextCaffeinated = props.launchContext?.caffeinated;

    let subtitle = "Inactive";

    if (contextCaffeinated !== undefined) {
      // Context was explicitly passed — use it directly
      if (contextCaffeinated) {
        // Fetch full state for detailed subtitle info
        const state = await getCaffeinateState();
        if (state.active) {
          if (
            state.mode === "duration" &&
            state.remainingSeconds !== undefined
          ) {
            const remainingMinutes = Math.ceil(state.remainingSeconds / 60);
            subtitle = `Active (${remainingMinutes}m remaining)`;
          } else if (state.mode === "process" && state.value) {
            subtitle = `Active (watching ${state.value})`;
          } else {
            subtitle = "Active";
          }
        } else {
          // Context says active but process seems dead — trust the process check
          subtitle = "Inactive";
        }
      } else {
        subtitle = "Inactive";
      }
    } else {
      // No context (e.g. background interval or user-initiated) — check state independently
      const state = await getCaffeinateState();
      if (state.active) {
        if (state.mode === "duration" && state.remainingSeconds !== undefined) {
          const remainingMinutes = Math.ceil(state.remainingSeconds / 60);
          subtitle = `Active (${remainingMinutes}m remaining)`;
        } else if (state.mode === "process" && state.value) {
          subtitle = `Active (watching ${state.value})`;
        } else {
          subtitle = "Active";
        }
      }
    }

    await updateCommandMetadata({ subtitle });
  } catch {
    // Ignore status errors
  }
}
