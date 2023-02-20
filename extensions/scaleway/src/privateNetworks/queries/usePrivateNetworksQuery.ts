import { VPC } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from '../../fetchLocalities'
import { useAPI } from '../../providers'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZonesPrivateNetworksQuery = (
  params: VPC.v1.ListPrivateNetworksRequest,
  dataloaderOptions: DataLoaderOptions<VPC.v1.ListPrivateNetworksResponse['privateNetworks']> = {}
) => {
  const { privateNetworksV1 } = useAPI()

  const zones = params.zone ? [params.zone] : VPC.v1.API.LOCALITIES

  const key = ['Private Networks', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllZones(
        zones,
        (request) => privateNetworksV1.listPrivateNetworks(request).all(),
        params
      ),
    dataloaderOptions
  )
}
