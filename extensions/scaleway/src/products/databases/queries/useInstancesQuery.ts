import { Rdbv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]
const defaultRegions = Rdbv1.API.LOCALITY.type === 'region' ? Rdbv1.API.LOCALITY.regions : []

export const useAllRegionInstancesQuery = (
  params: Rdbv1.ListInstancesRequest,
  dataloaderOptions?: DataLoaderOptions<Rdbv1.ListInstancesResponse['instances']>
) => {
  const { relationalDatabaseV1 } = useAPI()

  const key = ['rdb', 'instances', 'all', Object.entries(params).sort()].flat(3)

  const regions = params.region ? [params.region] : defaultRegions

  return useDataLoader(
    key,
    () =>
      fetchAllRegions(
        regions,
        (request) => relationalDatabaseV1.listInstances(request).all(),
        params
      ),
    dataloaderOptions
  )
}
