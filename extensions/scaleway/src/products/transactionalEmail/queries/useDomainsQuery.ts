import { Temv1alpha1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions =
  Temv1alpha1.API.LOCALITY.type === 'region' ? Temv1alpha1.API.LOCALITY.regions : []

export const useAllRegionsDomainsQuery = (
  params: Temv1alpha1.ListDomainsRequest,
  dataloaderOptions: DataLoaderOptions<Temv1alpha1.ListDomainsResponse['domains']> = {}
) => {
  const { transactionalEmailV1alpha1 } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['Temv1alpha1', 'listDomains', 'all', regions, Object.entries(params).sort()].flat(3)

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
