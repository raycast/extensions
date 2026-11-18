import { Containerv1beta1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]
const defaultRegions =
  Containerv1beta1.API.LOCALITY.type === 'region' ? Containerv1beta1.API.LOCALITY.regions : []

export const useAllRegionsNamespacesQuery = (
  params: Containerv1beta1.ListNamespacesRequest,
  dataloaderOptions: DataLoaderOptions<Containerv1beta1.ListNamespacesResponse['namespaces']> = {}
) => {
  const { containerV1Beta1 } = useAPI()
  const regions = params.region ? [params.region] : defaultRegions

  const key = ['containers', 'namespaces', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllRegions(regions, (request) => containerV1Beta1.listNamespaces(request).all(), params),
    dataloaderOptions
  )
}
