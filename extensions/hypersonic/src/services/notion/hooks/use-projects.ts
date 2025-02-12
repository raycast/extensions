import { useCachedPromise } from '@raycast/utils'
import { getProjects } from '../operations/get-projects'

export function useProjects(databaseId?: string) {
  const { data } = useCachedPromise(
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

  return {
    projects: data.projects,
    projectsById: data.projectsById,
  }
}
