import { useEffect, useState } from "react";
import { showError } from "./util";
import { apiDashboards, DashboardSummaryDefinition } from "./datadog-api";

type State = {
  dashboardsAreLoading: boolean;
  totalDashboards: number;
  dashboards: DashboardSummaryDefinition[];
};

export const useDashboards = (query: string) => {
  const [state, setState] = useState<State>({ dashboardsAreLoading: true, totalDashboards: 0, dashboards: [] });

  useEffect(() => {
    setState(prev => ({ ...prev, dashboardsAreLoading: true }));

    apiDashboards({ query })
      .then(({ dashboards, total }) =>
        setState({
          dashboards,
          totalDashboards: total,
          dashboardsAreLoading: false,
        }),
      )
      .catch(showError);
  }, [query]);

  return state;
};
