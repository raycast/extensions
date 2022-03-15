import { DashboardSummaryDefinition } from "@datadog/datadog-api-client/dist/packages/datadog-api-client-v1/models/DashboardSummaryDefinition";
import { Caches } from ".";
import { dashboardsApi } from "../clients/datadog";
import { useLocalState } from "./cache";

type State = {
  dashboards: DashboardSummaryDefinition[];
};

export const useDashboards = () => {
  const loader = () => {
    return dashboardsApi
      .listDashboards()
      .then(summary => summary.dashboards || [])
      .then(data => ({ dashboards: data } as State));
  };

  const { state, loading: dashboardsAreLoading } = useLocalState<State>(Caches.Dashboards, { dashboards: [] }, loader);

  return { state, dashboardsAreLoading };
};
