import type { Domainv2beta1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllDomainsQuery = (
  params: Domainv2beta1.RegistrarApiListDomainsRequest,
  dataloaderOptions: DataLoaderOptions<Domainv2beta1.ListDomainsResponse['domains']> = {}
) => {
  const { domainRegistrarV2beta1 } = useAPI()

  const key = ['Domains', 'domains', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => domainRegistrarV2beta1.listDomains(params).all(),
    dataloaderOptions
  )
}
