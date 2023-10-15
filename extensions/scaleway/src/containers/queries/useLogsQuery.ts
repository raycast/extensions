import type { Container } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from '../../providers'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllLogsQuery = (
  params: Container.v1beta1.ListLogsRequest,
  dataloaderOptions: DataLoaderOptions<Container.v1beta1.ListLogsResponse['logs']> = {}
) => {
  const { containerV1Beta1 } = useAPI()

  const key = ['containers', 'containers', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => containerV1Beta1.listLogs(params).all(), dataloaderOptions)
}
