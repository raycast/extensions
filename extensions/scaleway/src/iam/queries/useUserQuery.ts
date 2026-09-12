import type { Iamv1alpha1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useUserQuery = (
  params: Iamv1alpha1.GetUserRequest,
  dataloaderOptions?: DataLoaderOption<Iamv1alpha1.User>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'user', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.getUser(params), dataloaderOptions)
}
