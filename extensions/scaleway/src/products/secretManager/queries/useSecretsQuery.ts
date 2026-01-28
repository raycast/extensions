import { Secretv1beta1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { fetchAllRegions } from '../../../helpers/fetchLocalities'
import { useAPI } from '../../../helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

const defaultRegions =
  Secretv1beta1.API.LOCALITY.type === 'region' ? Secretv1beta1.API.LOCALITY.regions : []

export const useAllZoneSecretsQuery = (
  params: Secretv1beta1.ListSecretsRequest,
  dataloaderOptions: DataLoaderOptions<Secretv1beta1.ListSecretsResponse['secrets']> = {}
) => {
  const { secretManager } = useAPI()

  const regions = params.region ? [params.region] : defaultRegions

  const key = ['SecretManager', 'listSecrets', 'all', regions, Object.entries(params).sort()].flat(
    3
  )

  return useDataLoader(
    key,
    () => fetchAllRegions(regions, (request) => secretManager.listSecrets(request).all(), params),
    dataloaderOptions
  )
}
