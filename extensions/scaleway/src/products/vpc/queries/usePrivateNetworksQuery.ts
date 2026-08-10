import { Vpcv2 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions = Vpcv2.API.LOCALITY.type === 'region' ? Vpcv2.API.LOCALITY.regions : []

export const useAllRegionsPrivateNetworksQuery = (
  params: Vpcv2.ListPrivateNetworksRequest,
  dataloaderOptions: DataLoaderOptions<Vpcv2.ListPrivateNetworksResponse['privateNetworks']> = {}
) => {
  const { vpcV2 } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

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
