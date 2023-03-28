import { getPreferenceValues } from '@raycast/api'
import { getBearerTokenHeader } from '../utils'
import { initHttpClient } from '../utils/httpClient'
import {
  GrafanaDashboards,
  GrafanaPreference,
  GrafanaSimpleFolders
} from './types/grafana.type'
import { AxiosInstance, AxiosResponse } from "axios";

/*
  Reference to Grafana Document **https://grafana.com/docs/grafana/latest/developers/**
*/
export const buildGrafanaClient = (url: string, token: string) => {
  const httpClient = initHttpClient({
    baseURL: url,
    headers: getBearerTokenHeader(token)
  })
  const fetchAllFolders = () => httpClient.get<GrafanaSimpleFolders>('/grafana/api/folders')

  const fetchDashboardByFolder = (folderId: string) =>
    httpClient.get<GrafanaDashboards>(`/grafana/api/search?folderIds=${folderId}&query=&starred=false&type=type`)

  return { fetchAllFolders, fetchDashboardByFolder };
};

export type GrafanaClient = ReturnType<typeof buildGrafanaClient>;


