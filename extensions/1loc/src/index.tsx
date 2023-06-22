import { useEffect, useState, useRef } from "react"
import { ActionPanel, List, Action, getPreferenceValues } from "@raycast/api"
import axios, { AxiosError, AxiosResponse, CancelTokenSource } from "axios"
import { usePersistentState } from "raycast-toolkit"
import Snippet from "./snippet"
import RateLimitEmptyView from "./components/rate-limit-empty-view"

export interface ICategory {
  name: string
  type: "dir" | "file"
}

const { personalAccessToken } = getPreferenceValues<{ personalAccessToken?: string }>()

const useCategories = (): [ICategory[], boolean, AxiosResponse | null] => {
  const [categories, setCategories] = usePersistentState<ICategory[]>("categories", [])
  const [isLoading, setIsLoading] = useState(true)
  const [response, setResponse] = useState<AxiosResponse | null>(null)
  const cancelRef = useRef<CancelTokenSource | null>(null)
  const isMounted = useRef(true)

  useEffect(() => {
    const fetchCategories = async () => {
      cancelRef.current?.cancel()
      cancelRef.current = axios.CancelToken.source()
      const url = "https://api.github.com/repositories/251039251/contents/contents"
      const config = {
        cancelToken: cancelRef.current?.token,
        headers: personalAccessToken ? { Authorization: `token ${personalAccessToken}` } : undefined,
      }
      try {
        const { data } = await axios.get<ICategory[]>(url, config)
        if (isMounted.current) {
          const filtered = data.filter((item) => item.type === "dir" && !item.name.startsWith("_"))

          setCategories(filtered)
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

    fetchCategories()

    return () => {
      cancelRef.current?.cancel()
      isMounted.current = false
    }
  }, [])

  return [categories, isLoading, response]
}

const Main = () => {
  const [categories, isLoading, response] = useCategories()

  return (
    <List isLoading={isLoading}>
      {response?.status === 403 && categories.length === 0 ? (
        <RateLimitEmptyView />
      ) : (
        categories.map(({ name }) => (
          <List.Item
            key={name}
            icon="🗃️"
            title={name}
            actions={
              <ActionPanel>
                <Action.Push title={`Browse "${name}"`} target={<Snippet name={name} />} />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  )
}

export default Main
