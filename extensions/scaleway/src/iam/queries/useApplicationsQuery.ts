import type { Iamv1alpha1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useApplicationsQuery = (
  params: Iamv1alpha1.ListApplicationsRequest,
  dataloaderOptions?: DataLoaderOption<Iamv1alpha1.ListApplicationsResponse>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'applications', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listApplications(params), dataloaderOptions)
}

export const useAllApplicationsQuery = (
  params: Iamv1alpha1.ListApplicationsRequest,
  dataloaderOptions?: DataLoaderOption<Iamv1alpha1.ListApplicationsResponse['applications']>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'applications', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(
    key,
    async () => iamV1alpha1.listApplications(params).all(),
    dataloaderOptions
  )
}
