import { ApiConfig, ApiRequest, requestJson } from "./http";
import {
  BreakdownKind,
  BreakdownRow,
  Issue,
  IssueStatus,
  ListIssuesQuery,
  Overview,
  Pagination,
  ReportWindow,
  Website,
  WebsiteSelector,
} from "./types";

export const API_URL = "https://analytics.flowsery.com/analytics/api/v1";
export const APP_URL = "https://flowsery.com";

type DataResponse<T> = {
  status: "success";
  data: T;
  pagination?: Pagination;
};

export function createApi(config: ApiConfig) {
  const send = <T>(request: ApiRequest) => requestJson<DataResponse<T>>(config, request);

  return {
    listWebsites: () => send<Website[]>({ path: "/websites" }),
    getOverview: (websiteSelector: WebsiteSelector, reportWindow: ReportWindow) =>
      send<Overview[]>({ path: "/overview", query: { ...websiteSelector, ...reportWindow } }),
    getBreakdown: (kind: BreakdownKind, websiteSelector: WebsiteSelector, reportWindow: ReportWindow, limit: number) =>
      send<BreakdownRow[]>({ path: `/${kind}`, query: { ...websiteSelector, ...reportWindow, limit } }),
    getRealtime: (websiteSelector: WebsiteSelector) =>
      send<{ visitors?: number }[]>({ path: "/realtime", query: websiteSelector }),
    listIssues: (listIssuesQuery: ListIssuesQuery) => send<Issue[]>({ path: "/issues", query: listIssuesQuery }),
    updateIssueStatus: (issueId: string, websiteSelector: WebsiteSelector, status: IssueStatus) =>
      send<unknown>({
        method: "PATCH",
        path: `/issues/${encodeURIComponent(issueId)}`,
        query: websiteSelector,
        body: { status },
      }),
  };
}

export type FlowseryApi = ReturnType<typeof createApi>;
