import { Instance } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZoneServersQuery = (
  params: Instance.v1.ListServersRequest,
  dataloaderOptions: DataLoaderOptions<Instance.v1.ListServersResponse['servers']> = {}
) => {
  const { instanceV1 } = useAPI()

  const zones = params.zone ? [params.zone] : Instance.v1.API.LOCALITIES

  const key = ['Instance', 'servers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => instanceV1.listServers(request).all(), params),
    dataloaderOptions
  )
}
