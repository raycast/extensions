import { Blockv1alpha1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultZones =
  Blockv1alpha1.API.LOCALITY.type === 'zone' ? Blockv1alpha1.API.LOCALITY.zones : []

export const useAllZoneVolumesQuery = (
  params: Blockv1alpha1.ListVolumesRequest,
  dataloaderOptions: DataLoaderOptions<Blockv1alpha1.ListVolumesResponse['volumes']> = {}
) => {
  const { blockV1Alpha1 } = useAPI()

  const zones = params.zone ? [params.zone] : defaultZones

  const key = ['blockV1Alpha1.listVolumes', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => blockV1Alpha1.listVolumes(request).all(), params),
    dataloaderOptions
  )
}
