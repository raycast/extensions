import { Secret } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from '../../../helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useSecretVersionsQuery = (
  params: Secret.v1beta1.ListSecretVersionsRequest,
  dataloaderOptions: DataLoaderOptions<Secret.v1beta1.ListSecretVersionsResponse['versions']> = {}
) => {
  const { secretManager } = useAPI()

  const regions = params.region ? [params.region] : Secret.v1beta1.API.LOCALITIES

  const key = ['SecretManager', 'secrets', 'versions', regions, Object.entries(params).sort()].flat(
    3
  )

  return useDataLoader(key, () => secretManager.listSecretVersions(params).all(), dataloaderOptions)
}
