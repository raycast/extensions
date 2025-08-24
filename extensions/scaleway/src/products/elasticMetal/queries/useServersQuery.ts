import { BareMetal } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZoneServersQuery = (
  params: BareMetal.v1.ListServersRequest,
  dataloaderOptions: DataLoaderOptions<BareMetal.v1.ListServersResponse['servers']> = {}
) => {
  const { elasticMetalV1 } = useAPI()

  const zones = params.zone ? [params.zone] : BareMetal.v1.API.LOCALITIES

  const key = ['ElasticMetal', 'servers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => elasticMetalV1.listServers(request).all(), params),
    dataloaderOptions
  )
}
