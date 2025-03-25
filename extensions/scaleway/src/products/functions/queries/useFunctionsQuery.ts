import type { Function } from '@scaleway/sdk'
import { useDataLoader } from '@scaleway/use-dataloader'
import { useAPI } from 'helpers/useAPI'

type DataLoaderOptions<T> = Parameters<typeof useDataLoader<T>>[2]

export const useAllFunctionsQuery = (
  params: Function.v1beta1.ListFunctionsRequest,
  dataloaderOptions: DataLoaderOptions<Function.v1beta1.ListFunctionsResponse['functions']> = {}
) => {
  const { functionV1beta1 } = useAPI()

  const key = ['functionV1beta1', 'func', 'all', Object.entries(params).sort()].flat(3)

  return useDataLoader(key, () => functionV1beta1.listFunctions(params).all(), dataloaderOptions)
}
