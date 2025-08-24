import type { Domain } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllDomainsQuery = (
  params: Domain.v2beta1.RegistrarApiListDomainsRequest,
  dataloaderOptions: DataLoaderOptions<Domain.v2beta1.ListDomainsResponse['domains']> = {}
) => {
  const { domainRegistrarV2beta1 } = useAPI()

  const key = ['Domains', 'domains', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => domainRegistrarV2beta1.listDomains(params).all(),
    dataloaderOptions
  )
}
