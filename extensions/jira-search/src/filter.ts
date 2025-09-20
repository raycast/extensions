import { ResultItem, SearchCommand } from "./command"
import { jiraFetchObject, jiraUrl } from "./jira"

interface Filter {
  id: string
  name: string
}

interface Filters {
  values?: Filter[]
}

export async function searchFilters(query: string): Promise<ResultItem[]> {
  const result = await jiraFetchObject<Filters>("/rest/api/3/filter/search", { filterName: query })
  const mapResult = async (filter: Filter): Promise<ResultItem> => ({
    id: filter.id,
    title: filter.name,
    url: `${jiraUrl}/issues/?filter=${filter.id}`,
  })
  return result.values && result.values.length > 0 ? Promise.all(result.values.map(mapResult)) : []
}

export default function SearchFilterCommand() {
  return SearchCommand(searchFilters, "Search filter by title")
}
