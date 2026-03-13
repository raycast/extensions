import { ReactNode } from "react";

// api response
export interface DataResponse {
  isLoading: boolean;
  list: Chart[];
  error: Error;
}

// chart object
export interface Chart {
  id: string;
  title: string;
  thumbnails: {
    full: string;
    plain: string;
  };
  lastModifiedAt: string;
  publicVersion: boolean;
  folderId: number;
  authorId: string;
  createdAt: string;
  publishedAt: string;
  type: string;
  organizationId: string;
}

// chart actions for list and detail views
export interface ChartActionsProps {
  data: Chart;
  children?: ReactNode;
}

// chart type for creating new charts
export enum ChartType {
  Chart = "https://app.datawrapper.de/create/chart",
  Map = "https://app.datawrapper.de/select/map",
  Table = "https://app.datawrapper.de/create/table",
}

export type OrderOption = {
  id: "lastModifiedAt" | "publishedAt" | "createdAt";
  name: string;
  subtitleLabel: string;
};
