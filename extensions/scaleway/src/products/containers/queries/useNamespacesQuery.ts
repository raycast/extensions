import { Container } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionsNamespacesQuery = (
  params: Container.v1beta1.ListNamespacesRequest,
  dataloaderOptions: DataLoaderOptions<Container.v1beta1.ListNamespacesResponse['namespaces']> = {}
) => {
  const { containerV1Beta1 } = useAPI()
  const regions = params.region ? [params.region] : Container.v1beta1.API.LOCALITIES

  const key = ['containers', 'namespaces', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllRegions(regions, (request) => containerV1Beta1.listNamespaces(request).all(), params),
    dataloaderOptions
  )
}
