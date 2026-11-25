import type { List } from "@raycast/api";
import type { AsyncState } from "@raycast/utils";
import { type Dashboard, MetrixError } from "./metrix";

const errorTitles: Record<MetrixError["kind"], string> = {
  configuration: "Check Connection Preferences",
  authentication: "Authentication Failed",
  unavailable: "Could Not Connect to Metrix.Bar",
  timeout: "Connection Timed Out",
  response: "Could Not Load Dashboards",
};

export function getEmptyView(state: AsyncState<Dashboard[]>): Pick<List.EmptyView.Props, "title" | "description"> {
  if (state.isLoading) return { title: "Loading Dashboards…" };
  if (state.error) {
    return {
      title: state.error instanceof MetrixError ? errorTitles[state.error.kind] : "Could Not Load Dashboards",
      description: state.error instanceof MetrixError ? state.error.message : "Refresh dashboards and try again.",
    };
  }
  return state.data?.length
    ? { title: "No Matching Dashboards", description: "Try another title or dashboard ID." }
    : {
        title: "No Dashboards Installed",
        description: "Open Metrix.Bar to install a dashboard, then refresh this list.",
      };
}
