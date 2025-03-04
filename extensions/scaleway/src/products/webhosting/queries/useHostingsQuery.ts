import { Webhosting } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionHostingsQuery = (
  params: Webhosting.v1alpha1.ListHostingsRequest,
  dataloaderOptions: DataLoaderOptions<Webhosting.v1alpha1.ListHostingsResponse['hostings']>
) => {
  const { webhostingV1alpha1 } = useAPI()

  const regions = params.region ? [params.region] : Webhosting.v1alpha1.API.LOCALITIES

  const key = ['webhosting', 'hosting', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllRegions(regions, (request) => webhostingV1alpha1.listHostings(request).all(), params),
    dataloaderOptions
  )
}
