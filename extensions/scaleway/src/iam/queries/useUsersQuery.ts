import type { IAM } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useUsersQuery = (
  params: IAM.v1alpha1.ListUsersRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListUsersResponse>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'users', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listUsers(params), dataloaderOptions)
}

export const useAllUsersQuery = (
  params: IAM.v1alpha1.ListUsersRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListUsersResponse['users']>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'users', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listUsers(params).all(), dataloaderOptions)
}
