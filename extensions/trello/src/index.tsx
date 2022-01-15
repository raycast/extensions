import { List, showToast, ToastStyle } from '@raycast/api'
import { useEffect, useState } from 'react'
import { fetchTodos, searchTodos } from './utils/fetchTodos'
import { TrelloFetchResponse } from './trelloResponse.model'
import { TodoListItem } from './TrelloListItem'

export default function PackageList() {
  const [results, setTodos] = useState<TrelloFetchResponse>([])
  const [loading, setLoading] = useState<boolean>(false)

  const onSearchTextChange = async (text: string) => {
    setLoading(true)
    const response = await searchTodos(text.replace(/\s/g, '+'))
    setTodos(response)
    setLoading(false)
  }

  useEffect(() => {
    async function fetchAllTodos() {
      try {
        setLoading(true)

        const response = await fetchTodos()
        setLoading(false)

        setTodos(response)
      } catch (error) {
  showToast(ToastStyle.Failure, "Failed loading to dos");
      }
    }

    fetchAllTodos();
  }, []);

  return (
    <List
      isLoading={loading}
      searchBarPlaceholder={`Search todos`}
      onSearchTextChange={onSearchTextChange}
      throttle
    >
      {results?.length
        ? results.map((result) => {
          return <TodoListItem key={result.name} result={result} />
        })
        : null}
    </List>
  )
}