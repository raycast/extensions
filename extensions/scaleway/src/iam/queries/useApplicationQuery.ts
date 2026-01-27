import type { Iamv1alpha1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const useApplicationQuery = (
  params: Iamv1alpha1.GetApplicationRequest,
  dataloaderOptions?: DataLoaderOption<Iamv1alpha1.Application>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'application', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.getApplication(params), dataloaderOptions)
}
