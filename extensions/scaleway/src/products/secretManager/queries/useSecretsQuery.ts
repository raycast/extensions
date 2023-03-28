import { Secret } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from 'helpers/fetchLocalities'
import { useAPI } from 'providers'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllZoneSecretsQuery = (
  params: Secret.v1alpha1.ListSecretsRequest,
  dataloaderOptions: DataLoaderOptions<Secret.v1alpha1.ListSecretsResponse['secrets']> = {}
) => {
  const { secretManager } = useAPI()

  const regions = params.region ? [params.region] : Secret.v1alpha1.API.LOCALITIES

  const key = ['SecretManager', 'secrets', 'all', regions, Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => secretManager.listSecrets(request).all(), params),
    dataloaderOptions
  )
}
