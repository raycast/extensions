import { Instancev1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultZones = Instancev1.API.LOCALITY.type === 'zone' ? Instancev1.API.LOCALITY.zones : []

export const useAllZoneServersQuery = (
  params: Instancev1.ListServersRequest,
  dataloaderOptions: DataLoaderOptions<Instancev1.ListServersResponse['servers']> = {}
) => {
  const { instanceV1 } = useAPI()

  const zones = params.zone ? [params.zone] : defaultZones

  const key = ['Instance', 'servers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => instanceV1.listServers(request).all(), params),
    dataloaderOptions
  )
}
