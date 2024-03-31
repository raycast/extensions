import type { IAM } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useGroupsQuery = (
  params: IAM.v1alpha1.ListGroupsRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListGroupsResponse>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'groups', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listGroups(params), dataloaderOptions)
}

export const useAllGroupsQuery = (
  params: IAM.v1alpha1.ListGroupsRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListGroupsResponse['groups']>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'groups', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listGroups(params).all(), dataloaderOptions)
}
