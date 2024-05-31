import { LB } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZonesLoadBalancersQuery = (
  params: LB.v1.ZonedApiListLbsRequest,
  dataloaderOptions: DataLoaderOptions<LB.v1.ListLbsResponse['lbs']> = {}
) => {
  const { loadbalancerV1 } = useAPI()

  const zones = params.zone ? [params.zone] : LB.v1.ZonedAPI.LOCALITIES

  const key = ['LB', 'loadBalancers', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => loadbalancerV1.listLbs(request).all(), params),
    dataloaderOptions
  )
}
