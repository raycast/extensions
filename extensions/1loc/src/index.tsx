import { List, getPreferenceValues } from "@raycast/api"
import RateLimitEmptyView from "./components/rate-limit-empty-view"
import { useFetch } from "@raycast/utils"
import { sentenceCase } from "change-case"
import SnippetContent from "./components/snippet-content"

interface ICategory {
  name: string
  type: "dir" | "file"
}

const { personalAccessToken } = getPreferenceValues<Preferences>()

const Main = () => {
  const {
    isLoading,
    data: snippets,
    error,
  } = useFetch("https://api.github.com/repositories/251039251/contents/contents", {
    headers: { Authorization: `token ${personalAccessToken}` },
    async parseResponse(response) {
      if (!response.ok) throw new Error(`${response.status} Error`)
      const result = await response.json()
      return result
    },
    mapResult(result: ICategory[]) {
      const filtered = result.filter((item) => item.type === "file" && !item.name.startsWith("_"))
      return {
        data: filtered,
      }
    },
    initialData: [],
    keepPreviousData: true,
  })

  return (
    <List isLoading={isLoading} isShowingDetail>
      {error?.message.includes("403") && snippets.length === 0 ? (
        <RateLimitEmptyView />
      ) : (
        snippets.map(({ name }) => (
          <List.Item
            key={name}
            icon="🗒️"
            title={sentenceCase(name.replace(".mdx", ""))}
            detail={<SnippetContent name={name} />}
          />
        ))
      )}
    </List>
  )
}

export default Main
