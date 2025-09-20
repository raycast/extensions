import type { IAM } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useApiKeysQuery = (
  params: IAM.v1alpha1.ListAPIKeysRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListAPIKeysResponse>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'api-keys', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => iamV1alpha1.listAPIKeys(params), dataloaderOptions)
}

export const useAllApiKeysQuery = (
  params: IAM.v1alpha1.ListAPIKeysRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListAPIKeysResponse['apiKeys']>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'api-keys', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => iamV1alpha1.listAPIKeys(params).all(), dataloaderOptions)
}
