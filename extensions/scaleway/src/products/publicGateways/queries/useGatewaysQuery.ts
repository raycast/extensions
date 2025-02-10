import { VPCGW } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZonesGatewaysQuery = (
  params: VPCGW.v1.ListGatewaysRequest,
  dataloaderOptions: DataLoaderOptions<VPCGW.v1.ListGatewaysResponse['gateways']> = {}
) => {
  const { publicGatewaysV1 } = useAPI()

  const zones = params.zone ? [params.zone] : VPCGW.v1.API.LOCALITIES

  const key = ['PublicGateways', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => publicGatewaysV1.listGateways(request).all(), params),
    dataloaderOptions
  )
}
