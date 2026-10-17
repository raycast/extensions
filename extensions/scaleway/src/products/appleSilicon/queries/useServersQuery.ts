import { Applesiliconv1alpha1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

// https://github.com/scaleway/scaleway-sdk-js/pull/2573
const defaultZones =
  Applesiliconv1alpha1.API.LOCALITY.type === 'zone' ? Applesiliconv1alpha1.API.LOCALITY.zones : []

export const useAllZoneServersQuery = (
  params: Applesiliconv1alpha1.ListServersRequest,
  dataloaderOptions: DataLoaderOptions<Applesiliconv1alpha1.ListServersResponse['servers']> = {}
) => {
  const { appleSiliconV1Alpha1 } = useAPI()

  const zones = params.zone ? [params.zone] : defaultZones

  const key = ['AppleSilicon', 'servers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllZones(zones, (request) => appleSiliconV1Alpha1.listServers(request).all(), params),
    dataloaderOptions
  )
}
