import type { IAM } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useUserQuery = (
  params: IAM.v1alpha1.GetUserRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.User>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'user', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.getUser(params), dataloaderOptions)
}
