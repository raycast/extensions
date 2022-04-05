import { ActionPanel, List, Action } from "@raycast/api"
import { useState, useEffect } from "react"
import axios from "axios"

import Snippet from "./snippet"

interface ICategory {
  name: string
}

const Main = () => {
  const [categories, setCategories] = useState<ICategory[]>()

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await axios.get("https://api.github.com/repositories/251039251/contents/snippets")

      setCategories(data)
    }

    fetchCategories()
  }, [])

  if (!categories) {
    return <List isLoading />
  }

  return (
    <List>
      {categories.map(({ name }: ICategory) => (
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
      ))}
    </List>
  )
}

export default Main
