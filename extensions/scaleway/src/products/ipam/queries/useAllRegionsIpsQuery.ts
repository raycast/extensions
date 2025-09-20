import { IPAM } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionsIpsQuery = (
  params: IPAM.v1.ListIPsRequest,
  dataloaderOptions: DataLoaderOptions<IPAM.v1.ListIPsResponse['ips']> = {}
) => {
  const { ipamV1 } = useAPI()

  const regions = params.region ? [params.region] : IPAM.v1.API.LOCALITIES

  const key = ['ipamV1', 'listIPs', 'allRegions', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => ipamV1.listIPs(request).all(), params),
    dataloaderOptions
  )
}
