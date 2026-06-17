import { useCachedPromise } from '@raycast/utils'
import { useFetchMeta } from './utils/fetchItems'

export function useMeta() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    return await useFetchMeta()
  }, [])

  return { data, isLoading, revalidate }
}
