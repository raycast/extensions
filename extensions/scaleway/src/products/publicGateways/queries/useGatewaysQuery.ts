import { Vpcgwv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultZones = Vpcgwv1.API.LOCALITY.type === 'zone' ? Vpcgwv1.API.LOCALITY.zones : []

export const useAllZonesGatewaysQuery = (
  params: Vpcgwv1.ListGatewaysRequest,
  dataloaderOptions: DataLoaderOptions<Vpcgwv1.ListGatewaysResponse['gateways']> = {}
) => {
  const { publicGatewaysV1 } = useAPI()

  const zones = params.zone ? [params.zone] : defaultZones

  const key = ['PublicGateways', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => publicGatewaysV1.listGateways(request).all(), params),
    dataloaderOptions
  )
}
