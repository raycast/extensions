import { getPreferenceValues, List } from "@raycast/api"
import matter from "gray-matter"
import { Buffer } from "buffer"
import { useFetch } from "@raycast/utils"

interface ISnippet {
  content: string
  encoding: string
}

const { personalAccessToken } = getPreferenceValues<Preferences>()

const SnippetContent = ({ name }: { name: string }) => {
  const {
    isLoading,
    data: snippet,
    error,
  } = useFetch<ISnippet>(`https://api.github.com/repositories/251039251/contents/contents/${name}`, {
    headers: { Authorization: `token ${personalAccessToken}` },
    async parseResponse(response) {
      if (!response.ok) throw new Error(`${response.status} Error`)
      const result = await response.json()
      return result
    },
    keepPreviousData: true,
  })

  const getMarkdown = () => {
    if (error?.message.includes("403") && !snippet) {
      return `
# GitHub API rate limit exceeded

Check out the [documentation](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting) for details on how to generate a Personal Access Token, then update the extension's configuration.

Alternatively, try again later.
`
    }
    if (!snippet) {
      return "Loading…"
    }
    const parsed = matter(Buffer.from(snippet.content, "base64").toString("ascii"))

    return `# [${parsed.data.category}] ${parsed.data.title} ${parsed.content}`
  }

  return <List.Item.Detail isLoading={isLoading} markdown={getMarkdown()} />
}

export default SnippetContent
