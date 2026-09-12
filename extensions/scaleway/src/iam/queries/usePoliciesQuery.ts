import type { Iamv1alpha1 } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOption<T> = Parameters<typeof useDataLoader<T>>[2]

export const usePoliciesQuery = (
  params: Iamv1alpha1.ListPoliciesRequest,
  dataloaderOptions?: DataLoaderOption<Iamv1alpha1.ListPoliciesResponse>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'policies', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listPolicies(params), dataloaderOptions)
}

export const useAllPoliciesQuery = (
  params: Iamv1alpha1.ListPoliciesRequest,
  dataloaderOptions?: DataLoaderOption<Iamv1alpha1.ListPoliciesResponse['policies']>
) => {
  const { iamV1alpha1 } = useAPI()
  const key = ['iam', 'policies', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, async () => iamV1alpha1.listPolicies(params).all(), dataloaderOptions)
}
