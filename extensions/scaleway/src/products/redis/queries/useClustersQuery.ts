import { Redisv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllZones } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultZones = Redisv1.API.LOCALITY.type === 'zone' ? Redisv1.API.LOCALITY.zones : []

export const useAllZoneClustersQuery = (
  params: Redisv1.ListClustersRequest,
  dataloaderOptions: DataLoaderOptions<Redisv1.ListClustersResponse['clusters']> = {}
) => {
  const { redisV1 } = useAPI()

  const zones = params.zone ? [params.zone] : defaultZones

  const key = ['Redisv1', 'clusters', 'all', zones, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllZones(zones, (request) => redisV1.listClusters(request).all(), params),
    dataloaderOptions
  )
}
