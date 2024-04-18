import type { IAM } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useApplicationsQuery = (
  params: IAM.v1alpha1.ListApplicationsRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListApplicationsResponse>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'applications', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listApplications(params), dataloaderOptions)
}

export const useAllApplicationsQuery = (
  params: IAM.v1alpha1.ListApplicationsRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.ListApplicationsResponse['applications']>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'applications', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    async () => iamV1alpha1.listApplications(params).all(),
    dataloaderOptions
  )
}
