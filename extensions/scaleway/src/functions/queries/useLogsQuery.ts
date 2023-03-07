import type { Function } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from '../../providers'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllLogsQuery = (
  params: Function.v1beta1.ListLogsRequest,
  dataloaderOptions: DataLoaderOptions<Function.v1beta1.ListLogsResponse['logs']> = {}
) => {
  const { functionV1beta1 } = useAPI()

  const key = ['functionV1beta1', 'logs', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => functionV1beta1.listLogs(params).all(), dataloaderOptions)
}
