import { VPC } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionsPrivateNetworksQuery = (
  params: VPC.v2.ListPrivateNetworksRequest,
  dataloaderOptions: DataLoaderOptions<VPC.v2.ListPrivateNetworksResponse['privateNetworks']> = {}
) => {
  const { vpcV2 } = useAPI()

  const regions = params.region ? [params.region] : VPC.v2.API.LOCALITIES

  const key = [
    'vpcV2',
    'listPrivateNetworks',
    'allRegions',
    regions,
    Object.entries(params).sort(),
  ].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => vpcV2.listPrivateNetworks(request).all(), params),
    dataloaderOptions
  )
}
