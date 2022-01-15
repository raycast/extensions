import { ResultItem, SearchCommand } from "./command"
import { jiraFetchObject, jiraUrl } from "./jira"
import { jiraImage } from "./image"

interface Project {
  id: string
  name: string
  key: string
  avatarUrls: {
    "48x48": string
  }
}

interface Projects {
  values?: Project[]
}

export async function searchProjects(query: string): Promise<ResultItem[]> {
  const result = await jiraFetchObject<Projects>("/rest/api/3/project/search", { query })
  const mapResult = async (project: Project): Promise<ResultItem> => ({
    id: project.id,
    title: project.name,
    subtitle: project.key,
    icon: await jiraImage(project.avatarUrls["48x48"]),
    url: `${jiraUrl}/browse/${project.key}`,
  })
  return result.values && result.values.length > 0 ? Promise.all(result.values.map(mapResult)) : []
}

export default function SearchProjectCommand() {
  return SearchCommand(searchProjects, "Search project by title")
}
