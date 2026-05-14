import { Ipamv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions = Ipamv1.API.LOCALITY.type === 'region' ? Ipamv1.API.LOCALITY.regions : []

export const useAllRegionsIpsQuery = (
  params: Ipamv1.ListIPsRequest,
  dataloaderOptions: DataLoaderOptions<Ipamv1.ListIPsResponse['ips']> = {}
) => {
  const { ipamV1 } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['ipamV1', 'listIPs', 'allRegions', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => ipamV1.listIPs(request).all(), params),
    dataloaderOptions
  )
}
