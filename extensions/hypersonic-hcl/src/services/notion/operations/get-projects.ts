import { loadPreferences } from '@/services/storage'
import { Project } from '@/types/project'
import { notion } from '../client'
import { normalizeProject } from '../utils/normalize-project'

export async function getProjects(databaseId: string): Promise<{
  projects: Project[]
  projectsById: Record<string, Project>
}> {
  const notionClient = await notion()
  const preferences = await loadPreferences()
  const status = preferences.properties.relatedDatabase?.status
  const titleProperty = preferences.properties.relatedDatabase?.title

  if (!titleProperty) {
    throw new Error('No title property found for related database')
  }

  let donePropertyQuery = {}
  if (status && status.name) {
    const filter = {
      filter: {
        property: status.name,
        ...(status.type === 'status' && status.doneName
          ? { status: { does_not_equal: status.doneName } }
          : { checkbox: { equals: false } }),
      },
    }

    donePropertyQuery = filter
  }

  const response = await notionClient.databases.query({
    database_id: databaseId,
    ...donePropertyQuery,
    sorts: [
      {
        timestamp: 'created_time',
        direction: 'ascending',
      },
    ],
  })

  const projects =
    response.results.map((page) => normalizeProject({ page, titleProperty })) ||
    []

  const projectsById = projects.reduce((acc, project) => {
    acc[project.id] = project
    return acc
  }, {} as Record<string, Project>)

  return { projects, projectsById }
}
