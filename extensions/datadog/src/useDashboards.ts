import {useEffect, useState} from "react";
import fetch from "node-fetch";
import {getPreferenceValues} from "@raycast/api";
import {showError} from "./util";

type DashboardSummaryDefinition = {
  popularity: number;
  tags: any[];
  is_favorite: boolean;
  id: string;
  icon: null;
  integration_id: null;
  is_shared: boolean;
  author: Author;
  url: string;
  title: string;
  modified: Date;
  created: Date;
  is_read_only: boolean;
  type: string;
}

type Author = {
  handle: string;
  name: string;
}

type State = {
  dashboardsAreLoading: boolean;
  totalDashboards: number;
  dashboards: DashboardSummaryDefinition[];
}

type DashboardSearchApiResponse = {
  total: number;
  dashboards: DashboardSummaryDefinition[];
};

export const useDashboards = (query: string) => {
  const [state, setState] = useState<State>({dashboardsAreLoading: true, totalDashboards: 0, dashboards: []});

  useEffect(() => {
    setState(prev => ({...prev, dashboardsAreLoading: true}));

    fetch(
      encodeURI(
        `https://app.datadoghq.com/api/v1/dashboard_search?with_suggested=true&query=${query}&start=0&count=50&sort=`
      ),
      {
        headers: {
          "DD-API-KEY": getPreferenceValues()["api-key"],
          "DD-APPLICATION-KEY": getPreferenceValues()["app-key"],
        },
      }
    )
      .then(res => res.json())
      .then(json => json as DashboardSearchApiResponse)
      .then(({dashboards, total}) =>
        setState(prev => ({
          ...prev,
          dashboards,
          totalDashboards: total,
          dashboardsAreLoading: false,
        })))
      .catch(showError);
  }, [query]);

  return state;
};
