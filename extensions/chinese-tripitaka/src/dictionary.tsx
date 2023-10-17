import { ActionPanel, Detail, List, Action } from "@raycast/api"
import { useEffect, useState } from "react"
import fetch from "node-fetch"

type ItemType = {
  dictid: number
  dict: string
  expl: string
}

export default function Command() {
  const [items, setItems] = useState<ItemType[]>([])

  useEffect(() => {
    fetch("https://deerpark.app/api/v1/dict/lookup/如來藏")
      .then((response) => response.json())
      .then((json) =>
        setItems(
          json.data.map((item: ItemType) => {
            return { ...item, expl: item.expl.replace(/<\/?p>/g, "") }
          })
        )
      )
  }, [])

  return (
    <List>
      {items.map((item: ItemType, index) => (
        <List.Item
          key={index}
          icon="list-icon.png"
          title={item.dict}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown={item.expl} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
