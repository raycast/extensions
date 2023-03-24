import { getOAuthClient } from '../utils/googleOauthClient'
import { Spreadsheets } from './types/bookmark.type'

const GOOGLE_CONFIG = {
  timeout: 10000,
  retryConfig: {
    retry: 10,
    retryDelay: 5000
  }
}

const API_BASE_URL = `https://sheets.googleapis.com/v4/spreadsheets`
export const fetchAllSheetsInfo = async (spreadsheetId: string) => {
  const client = await getOAuthClient()
  return client.request<Spreadsheets>({
    url: `${API_BASE_URL}/${spreadsheetId}`,
    ...GOOGLE_CONFIG
  })
}

export interface ValueRange {
  range: string
  values: string[][]
}

export const fetchSheetValues = async (spreadsheetId: string, ranges: string[]) => {
  const client = await getOAuthClient()
  return client.request<{ valueRanges: ValueRange[] }>({
    method: 'GET',
    url: `${API_BASE_URL}/${spreadsheetId}/values:batchGet`,
    params: { ranges },
    ...GOOGLE_CONFIG
  })
}
