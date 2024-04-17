import type { IAM } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useApplicationQuery = (
  params: IAM.v1alpha1.GetApplicationRequest,
  dataloaderOptions?: DataLoaderOption<IAM.v1alpha1.Application>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'application', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.getApplication(params), dataloaderOptions)
}
