import { MNQ } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from '../../fetchLocalities'
import { useAPI } from '../../providers'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionNamespacesQuery = (
  params: MNQ.v1alpha1.ListNamespacesRequest,
  dataloaderOptions: DataLoaderOptions<MNQ.v1alpha1.ListNamespacesResponse['namespaces']> = {}
) => {
  const { mnqV1alpha1 } = useAPI()

  const regions = params.region ? [params.region] : MNQ.v1alpha1.API.LOCALITIES

  const key = ['MNQ', 'namespaces', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => mnqV1alpha1.listNamespaces(request).all(), params),
    dataloaderOptions
  )
}
