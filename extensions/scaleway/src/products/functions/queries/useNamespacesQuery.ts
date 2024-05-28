import { Function } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionsNamespacesQuery = (
  params: Function.v1beta1.ListNamespacesRequest,
  dataloaderOptions: DataLoaderOptions<Function.v1beta1.ListNamespacesResponse['namespaces']> = {}
) => {
  const { functionV1beta1 } = useAPI()
  const regions = params.region ? [params.region] : Function.v1beta1.API.LOCALITIES

  const key = ['functionV1beta1', 'namespaces', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllRegions(regions, (request) => functionV1beta1.listNamespaces(request).all(), params),
    dataloaderOptions
  )
}
