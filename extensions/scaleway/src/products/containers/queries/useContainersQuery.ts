import type { Containerv1beta1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllContainersQuery = (
  params: Containerv1beta1.ListContainersRequest,
  dataloaderOptions: DataLoaderOptions<Containerv1beta1.ListContainersResponse['containers']> = {}
) => {
  const { containerV1Beta1 } = useAPI()

  const key = ['containers', 'containers', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => containerV1Beta1.listContainers(params).all(), dataloaderOptions)
}
