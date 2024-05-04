import { K8S } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionClustersQuery = (
  params: K8S.v1.ListClustersRequest,
  dataloaderOptions: DataLoaderOptions<K8S.v1.ListClustersResponse['clusters']> = {}
) => {
  const { k8sV1 } = useAPI()

  const regions = params.region ? [params.region] : K8S.v1.API.LOCALITIES

  const key = ['K8S', 'clusters', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => k8sV1.listClusters(request).all(), params),
    dataloaderOptions
  )
}
