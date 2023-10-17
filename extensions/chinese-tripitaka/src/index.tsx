import { ActionPanel, Action, List } from "@raycast/api"
import { useFetch } from "@raycast/utils"
import { tw2cn } from "cjk-conv"

export default function Command() {
  const { data, isLoading } = useFetch<Array<Work>>("https://deerpark.app/api/v1/allworks", {
    parseResponse: parseFetchResponse,
  })
  return (
    <List isLoading={isLoading} searchBarPlaceholder="Loading data…">
      <List.Section title="Results" subtitle={`${data?.length || 0} works`}>
        {data?.map((work) => (
          <WorkListItem key={work.id} work={work} />
        ))}
      </List.Section>
    </List>
  )
}

function WorkListItem({ work }: { work: Work }) {
  return (
    <List.Item
      title={work.title}
      subtitle={work.byline + " " + work.juans}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser title="Open in Browser" url={work.url || ""} />
        </ActionPanel>
      }
    />
  )
}

async function parseFetchResponse(response: Response) {
  if (!response.ok) {
    throw new Error(response.statusText)
  }

  const json = await response.json()
  for (const work of json) {
    work.title = tw2cn(work.title)
    work.byline = tw2cn(work.byline)
    work.url = `https://deerpark.app/reader/${work.id}/${work.juans[0]}`
  }
  return json
}

interface Work {
  id: string
  title: string
  byline: string
  juans: number[]
  chars: number
  alias?: string
  alt?: string
  url?: string
}
