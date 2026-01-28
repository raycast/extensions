import { Secretv1beta1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from '../../../helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions =
  Secretv1beta1.API.LOCALITY.type === 'region' ? Secretv1beta1.API.LOCALITY.regions : []

export const useSecretVersionsQuery = (
  params: Secretv1beta1.ListSecretVersionsRequest,
  dataloaderOptions: DataLoaderOptions<Secretv1beta1.ListSecretVersionsResponse['versions']> = {}
) => {
  const { secretManager } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['SecretManager', 'secrets', 'versions', regions, Object.entries(params).sort()].flat(
    3
  )

  return useDataLoader(key, () => secretManager.listSecretVersions(params).all(), dataloaderOptions)
}
