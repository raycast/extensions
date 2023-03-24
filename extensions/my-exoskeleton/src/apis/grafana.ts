import { getPreferenceValues } from '@raycast/api'
import { getBearerTokenHeader } from '../utils'
import { initHttpClient } from '../utils/httpClient'
import { GrafanaDashboards, GrafanaPreference, GrafanaSimpleFolders } from './types/grafana.type'

/*
  Reference to Grafana Document **https://grafana.com/docs/grafana/latest/developers/**
*/

const { GrafanaPAT, GrafanaBaseUrl } = getPreferenceValues<GrafanaPreference>()
const httpClient = initHttpClient({
  baseURL: GrafanaBaseUrl,
  headers: getBearerTokenHeader(GrafanaPAT)
})

const fetchAllFolders = () => httpClient.get<GrafanaSimpleFolders>('/grafana/api/folders')

const fetchDashboardByFolder = (folderId: string) =>
  httpClient.get<GrafanaDashboards>(`/grafana/api/search?folderIds=${folderId}&query=&starred=false&type=type`)

export { fetchAllFolders, fetchDashboardByFolder }
