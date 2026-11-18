export interface LightdashUser {
  uuid: string;
  firstName: string;
  lastName: string;
}

export interface LightdashProject {
  uuid: string;
  name: string;
}

export interface LightdashSpace {
  uuid: string;
  name: string;
}

export interface LightdashContentBase {
  contentType: "chart" | "dashboard" | "space";
  uuid: string;
  slug: string;
  name: string;
  description: string | null;
  createdAt: string;
  createdBy: LightdashUser | null;
  lastUpdatedAt: string | null;
  lastUpdatedBy: LightdashUser | null;
  project: LightdashProject;
  organization: { uuid: string; name: string };
  space: LightdashSpace;
  pinnedList: { uuid: string } | null;
}

export interface LightdashChart extends LightdashContentBase {
  contentType: "chart";
  source: string;
  chartKind: string | null;
  dashboard: { uuid: string; name: string } | null;
}

export interface LightdashDashboard extends LightdashContentBase {
  contentType: "dashboard";
}

export interface LightdashSpaceContent extends LightdashContentBase {
  contentType: "space";
  isPrivate: boolean;
  access: string[];
  chartCount: number;
  dashboardCount: number;
  parentSpaceUuid: string | null;
  path: string;
}

export type LightdashContentItem = LightdashChart | LightdashDashboard | LightdashSpaceContent;

export interface LightdashContentResponse {
  status: string;
  results: {
    data: LightdashContentItem[];
    pagination: {
      page: number;
      pageSize: number;
      totalPageCount: number;
      totalResults?: number;
    };
  };
}

export interface LightdashProjectListResponse {
  status: string;
  results: Array<{
    projectUuid: string;
    name: string;
    type: string;
  }>;
}
