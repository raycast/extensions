import { Redis } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZoneClustersQuery = (
  params: Redis.v1.ListClustersRequest,
  dataloaderOptions: DataLoaderOptions<Redis.v1.ListClustersResponse['clusters']> = {}
) => {
  const { redisV1 } = useAPI()

  const zones = params.zone ? [params.zone] : Redis.v1.API.LOCALITIES

  const key = ['redis', 'clusters', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => redisV1.listClusters(request).all(), params),
    dataloaderOptions
  )
}
