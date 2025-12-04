import { Webhostingv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

const defaultRegions =
  Webhostingv1.HostingAPI.LOCALITY.type === 'region' ? Webhostingv1.HostingAPI.LOCALITY.regions : []

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionHostingsQuery = (
  params: Webhostingv1.HostingApiListHostingsRequest,
  dataloaderOptions: DataLoaderOptions<Webhostingv1.ListHostingsResponse['hostings']>
) => {
  const { webhostingv1 } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['webhosting', 'hosting', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => webhostingv1.listHostings(request).all(), params),
    dataloaderOptions
  )
}
