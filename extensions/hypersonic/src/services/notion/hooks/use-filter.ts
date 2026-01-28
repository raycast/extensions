import { Filter } from '@/types/filter'
import { useCachedState } from '@raycast/utils'

export function useFilter() {
  const [filterTodo, setFilterTodo] = useCachedState<Filter>('filter', {
    projectId: null,
    user: null,
    tag: null,
    status: null,
  })

  return { filterTodo, setFilterTodo }
}
