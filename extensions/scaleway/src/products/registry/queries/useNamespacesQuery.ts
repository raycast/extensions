import { Registry } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionNamespacesQuery = (
  params: Registry.v1.ListNamespacesRequest,
  dataloaderOptions: DataLoaderOptions<Registry.v1.ListNamespacesResponse['namespaces']> = {}
) => {
  const { registryV1 } = useAPI()

  const regions = params.region ? [params.region] : Registry.v1.API.LOCALITIES

  const key = ['Registry', 'namespaces', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => registryV1.listNamespaces(request).all(), params),
    dataloaderOptions
  )
}
