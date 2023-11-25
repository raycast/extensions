import { useEffect, useState, useRef } from "react"
import { List, getPreferenceValues } from "@raycast/api"
import axios, { AxiosError, AxiosResponse, CancelTokenSource } from "axios"
import { usePersistentState } from "raycast-toolkit"
import { sentenceCase } from "change-case"
import SnippetContent from "./components/snippet-content"
import RateLimitEmptyView from "./components/rate-limit-empty-view"

interface ISnippet {
  name: string
}

const { personalAccessToken } = getPreferenceValues<{ personalAccessToken?: string }>()

const useSnippets = (name: string): [ISnippet[], boolean, AxiosResponse | null] => {
  const [snippets, setSnippet] = usePersistentState<ISnippet[]>(`snippet-${name}`, [])
  const [isLoading, setIsLoading] = useState(true)
  const [response, setResponse] = useState<AxiosResponse | null>(null)
  const cancelRef = useRef<CancelTokenSource | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    const fetchSnippets = async () => {
      cancelRef.current?.cancel()
      cancelRef.current = axios.CancelToken.source()
      const url = `https://api.github.com/repositories/251039251/contents/contents/${name}`
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

    fetchSnippets()

    return () => {
      cancelRef.current?.cancel()
      isMounted.current = false
    }
  }, [])
  return [snippets, isLoading, response]
}

const Snippet = ({ name }: { name: string }) => {
  const [snippets, isLoading, response] = useSnippets(name)

  return (
    <List
      isLoading={isLoading || (snippets.length === 0 && response?.status !== 403)}
      isShowingDetail={!isLoading && snippets.length !== 0}
    >
      {response?.status === 403 && snippets.length === 0 ? (
        <RateLimitEmptyView />
      ) : (
        snippets.map((snippet: ISnippet) => (
          <List.Item
            key={snippet.name}
            icon="🗒️"
            title={sentenceCase(snippet.name.replace(".md", ""))}
            detail={<SnippetContent categoryName={name} name={snippet.name} />}
          />
        ))
      )}
    </List>
  )
}

export default Snippet
