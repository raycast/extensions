import got from 'got'
import { SearchResult, SearchType } from './type'

const client = got.extend({
  hooks: {},
})

export default client

export async function search<T extends SearchType>(
  type: T,
  keyword: string,
): Promise<{ data: SearchResult[T][] }> {
  console.log(type, keyword)
  const { data } = await client({
    method: 'post',
    url: 'http://podcast-service-yangmei.podcast-beta.svc.cluster.local:3000/management/search/create',
    json: {
      type,
      skip: 0,
      limit: 10,
      query: { keyword },
    },
  }).json<{ data: SearchResult[T][] }>()

  return { data }
}
