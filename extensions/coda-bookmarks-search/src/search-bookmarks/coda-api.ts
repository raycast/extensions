import axios from 'axios'

// https://coda.io/developers/apis/v1#tag/Rows/operation/listRows
interface ListRowsParams {
  query?: string
  sortBy?: 'natural' | 'createdAt' | 'updatedAt'
  useColumnNames?: boolean
  valueFormat?: 'simple' | 'simpleWithArrays' | 'rich'
  visibleOnly?: boolean
  limit?: number
  pageToken?: string | null
  syncToken?: string | null
}

interface CodaApiResponse {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  items: any[]
  href: string
  nextPageToken?: string
  nextPageLink?: string
  nextSyncToken?: string
}

type CodaApiQueryFn = (params: ListRowsParams) => Promise<CodaApiResponse>

export default class CodaApi {
  apiToken = ''

  constructor(apiToken: string) {
    this.apiToken = apiToken
  }

  async fetchAllItems(queryFn: CodaApiQueryFn) {
    const data = []

    let firstRequest = true
    let pageToken = null

    while (firstRequest || pageToken) {
      try {
        const res: CodaApiResponse = await queryFn({
          pageToken,
        })

        data.push(...res.items)

        pageToken = res.nextPageToken || null
      } catch (err) {
        console.error(err)

        pageToken = null
      }

      firstRequest = false
    }

    return data
  }

  async getTableRows(docId: string, tableIdOrName: string, params = {}) {
    const url = `https://coda.io/apis/v1/docs/${docId}/tables/${tableIdOrName}/rows`
    const headers = {
      Authorization: `Bearer ${this.apiToken}`,
    }

    const result = await axios.get(url, { headers, params })

    return result.data as CodaApiResponse
  }
}
