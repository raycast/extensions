import { K8Sv1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions = K8Sv1.API.LOCALITY.type === 'region' ? K8Sv1.API.LOCALITY.regions : []

export const useAllRegionClustersQuery = (
  params: K8Sv1.ListClustersRequest,
  dataloaderOptions: DataLoaderOptions<K8Sv1.ListClustersResponse['clusters']> = {}
) => {
  const { k8sV1 } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['K8S', 'clusters', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => k8sV1.listClusters(request).all(), params),
    dataloaderOptions
  )
}
