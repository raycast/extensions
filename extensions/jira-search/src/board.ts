import { ResultItem, SearchCommand } from "./command"
import { jiraFetchObject, jiraUrl } from "./jira"
import { jiraImage } from "./image"
import { Icon } from "@raycast/api"

interface Board {
  id: number
  name: string
  type: string
  location?: {
    displayName: string
    avatarURI: string
  }
}

interface Boards {
  values?: Board[]
}

export async function searchBoards(query: string): Promise<ResultItem[]> {
  const result = await jiraFetchObject<Boards>("/rest/agile/1.0/board", { name: query })
  const mapResult = async (board: Board): Promise<ResultItem> => ({
    id: board.id.toString(),
    title: board.name,
    subtitle: board.location?.displayName,
    accessories: [{ tag: board.type }],
    icon: board.location ? await jiraImage(board.location.avatarURI) : Icon.BarChart,
    url: `${jiraUrl}/secure/RapidBoard.jspa?rapidView=${board.id}`,
  })
  return result.values && result.values.length > 0 ? Promise.all(result.values.map(mapResult)) : []
}

export default function SearchBoardCommand() {
  return SearchCommand(searchBoards, "Search board by title")
}
