import { Iotv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions = Iotv1.API.LOCALITY.type === 'region' ? Iotv1.API.LOCALITY.regions : []

export const useAllRegionsHubsQuery = (
  params: Iotv1.ListHubsRequest,
  dataloaderOptions: DataLoaderOptions<Iotv1.ListHubsResponse['hubs']> = {}
) => {
  const { iotV1 } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['iotV1', 'listHubs', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => iotV1.listHubs(request).all(), params),
    dataloaderOptions
  )
}
