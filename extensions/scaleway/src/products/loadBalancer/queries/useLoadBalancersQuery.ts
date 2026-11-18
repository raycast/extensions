import { Lbv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultZones = Lbv1.API.LOCALITY.type === 'zone' ? Lbv1.API.LOCALITY.zones : []

export const useAllZonesLoadBalancersQuery = (
  params: Lbv1.ZonedApiListLbsRequest,
  dataloaderOptions: DataLoaderOptions<Lbv1.ListLbsResponse['lbs']> = {}
) => {
  const { loadbalancerV1 } = useAPI()

  const zones = params.zone ? [params.zone] : defaultZones

  const key = ['Lbv1', 'loadBalancers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => loadbalancerV1.listLbs(request).all(), params),
    dataloaderOptions
  )
}
