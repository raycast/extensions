import { Baremetalv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultZones = Baremetalv1.API.LOCALITY.type === 'zone' ? Baremetalv1.API.LOCALITY.zones : []

export const useAllZoneServersQuery = (
  params: Baremetalv1.ListServersRequest,
  dataloaderOptions: DataLoaderOptions<Baremetalv1.ListServersResponse['servers']> = {}
) => {
  const { elasticMetalV1 } = useAPI()

  const zones = params.zone ? [params.zone] : defaultZones

  const key = ['ElasticMetal', 'servers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => elasticMetalV1.listServers(request).all(), params),
    dataloaderOptions
  )
}
