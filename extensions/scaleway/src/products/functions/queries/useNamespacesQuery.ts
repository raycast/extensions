import { Functionv1beta1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions =
  Functionv1beta1.API.LOCALITY.type === 'region' ? Functionv1beta1.API.LOCALITY.regions : []

export const useAllRegionsNamespacesQuery = (
  params: Functionv1beta1.ListNamespacesRequest,
  dataloaderOptions: DataLoaderOptions<Functionv1beta1.ListNamespacesResponse['namespaces']> = {}
) => {
  const { functionV1beta1 } = useAPI()
  const regions = params.region ? [params.region] : defaultRegions

  const key = ['functionV1beta1', 'namespaces', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllRegions(regions, (request) => functionV1beta1.listNamespaces(request).all(), params),
    dataloaderOptions
  )
}
