import { Registryv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions =
  Registryv1.API.LOCALITY.type === 'region' ? Registryv1.API.LOCALITY.regions : []

export const useAllRegionNamespacesQuery = (
  params: Registryv1.ListNamespacesRequest,
  dataloaderOptions: DataLoaderOptions<Registryv1.ListNamespacesResponse['namespaces']> = {}
) => {
  const { registryV1 } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['Registry', 'namespaces', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => registryV1.listNamespaces(request).all(), params),
    dataloaderOptions
  )
}
