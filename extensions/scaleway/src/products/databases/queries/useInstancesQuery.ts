import { RDB } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionInstancesQuery = (
  params: RDB.v1.ListInstancesRequest,
  dataloaderOptions?: DataLoaderOptions<RDB.v1.ListInstancesResponse['instances']>
) => {
  const { relationalDatabaseV1 } = useAPI()

  const key = ['rdb', 'instances', 'all', Object.entries(params).sort()].flat(3)

  const regions = params.region ? [params.region] : RDB.v1.API.LOCALITIES

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
