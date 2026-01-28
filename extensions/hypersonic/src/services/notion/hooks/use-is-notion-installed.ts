import { useCachedPromise } from '@raycast/utils'
import { isNotionInstalled } from '../utils/is-notion-installed'

export function useIsNotionInstalled() {
  const { data } = useCachedPromise(isNotionInstalled, [], {
    initialData: undefined,
    keepPreviousData: true,
  })

  return data
}
