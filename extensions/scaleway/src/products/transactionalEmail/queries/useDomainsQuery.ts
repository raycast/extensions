import { TransactionalEmail } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllRegionsDomainsQuery = (
  params: TransactionalEmail.v1alpha1.ListDomainsRequest,
  dataloaderOptions: DataLoaderOptions<
    TransactionalEmail.v1alpha1.ListDomainsResponse['domains']
  > = {}
) => {
  const { transactionalEmailV1alpha1 } = useAPI()

  const regions = params.region ? [params.region] : TransactionalEmail.v1alpha1.API.LOCALITIES

  const key = ['ElasticMetal', 'servers', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () =>
      fetchAllRegions(
        regions,
        (request) => transactionalEmailV1alpha1.listDomains(request).all(),
        params
      ),
    dataloaderOptions
  )
}
