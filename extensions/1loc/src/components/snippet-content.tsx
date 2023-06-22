import { useState, useEffect, useRef } from "react"
import { getPreferenceValues, List } from "@raycast/api"
import { usePersistentState } from "raycast-toolkit"
import matter from "gray-matter"
import { Buffer } from "buffer"
import axios, { AxiosError, AxiosResponse, CancelTokenSource } from "axios"

interface ISnippet {
  content: string
  encoding: string
}

const { personalAccessToken } = getPreferenceValues<{ personalAccessToken?: string }>()

const useSnippet = (categoryName: string, name: string): [ISnippet | null, boolean, AxiosResponse | null] => {
  const [snippet, setSnippet] = usePersistentState<ISnippet | null>(`snippet-${categoryName}-${name}`, null)
  const [isLoading, setIsLoading] = useState(true)
  const [response, setResponse] = useState<AxiosResponse | null>(null)
  const cancelRef = useRef<CancelTokenSource | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    const fetchSnippet = async () => {
      cancelRef.current?.cancel()
      cancelRef.current = axios.CancelToken.source()
      const url = `https://api.github.com/repositories/251039251/contents/contents/${categoryName}/${name}`
      const config = {
        cancelToken: cancelRef.current?.token,
        headers: personalAccessToken ? { Authorization: `token ${personalAccessToken}` } : undefined,
      }
      try {
        const { data } = await axios.get(url, config)
        if (isMounted.current) {
          setSnippet(data)
          setIsLoading(false)
        }
      } catch (e) {
        if (isMounted.current) {
          setIsLoading(false)
        }
        if (axios.isCancel(e)) {
          return
        }
        if (isMounted.current) {
          setResponse((e as AxiosError).response ?? null)
        }
      }
    }

    fetchSnippet()

    return () => {
      cancelRef.current?.cancel()
      isMounted.current = false
    }
  }, [])
  return [snippet, isLoading, response]
}

const SnippetContent = ({ categoryName, name }: { categoryName: string; name: string }) => {
  const [snippet, isLoading, response] = useSnippet(categoryName, name)

  const getMarkdown = () => {
    if (response?.status === 403 && !snippet) {
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
