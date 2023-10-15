import { useCachedPromise } from '@raycast/utils'
import { getProjects } from '../operations/get-projects'

export function useProjects(databaseId?: string) {
  return useCachedPromise(
    async (databaseId) => {
      const data = await getProjects(databaseId)
      return data
    },
    [databaseId],
    {
      initialData: {
        projects: [],
        projectsById: {},
      },
      keepPreviousData: true,
      execute: !!databaseId,
    }
  )
}
