import { IOT } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionsHubsQuery = (
  params: IOT.v1.ListHubsRequest,
  dataloaderOptions: DataLoaderOptions<IOT.v1.ListHubsResponse['hubs']> = {}
) => {
  const { iotV1 } = useAPI()

  const regions = params.region ? [params.region] : IOT.v1.API.LOCALITIES

  const key = ['IOT', 'servers', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => iotV1.listHubs(request).all(), params),
    dataloaderOptions
  )
}
