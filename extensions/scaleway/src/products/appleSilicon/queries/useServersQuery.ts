import { AppleSilicon } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZoneServersQuery = (
  params: AppleSilicon.v1alpha1.ListServersRequest,
  dataloaderOptions: DataLoaderOptions<AppleSilicon.v1alpha1.ListServersResponse['servers']> = {}
) => {
  const { appleSiliconV1Alpha1 } = useAPI()

  const zones = params.zone ? [params.zone] : AppleSilicon.v1alpha1.API.LOCALITIES

  const key = ['AppleSilicon', 'servers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllZones(zones, (request) => appleSiliconV1Alpha1.listServers(request).all(), params),
    dataloaderOptions
  )
}
