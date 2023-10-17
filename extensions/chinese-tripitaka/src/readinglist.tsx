import { ActionPanel, Detail, List, Action } from "@raycast/api"
import { useEffect, useState } from "react"
import fetch from "node-fetch"

type ItemType = {
  id: string
  title: string
  byline: string
  juans: [number]
  juan: number
  chars: number
  url: string
}

export default function Command() {
  const [items, setItems] = useState<ItemType[]>([])

  useEffect(() => {
    fetch("https://deerpark.app/api/v1/readinglist/home")
      .then((response) => response.json())
      .then((json) =>
        setItems(
          json.items.map((item: ItemType) => {
            // item.url = `https://deerpark.app/reader/${item.id}/${item.juans[0]}`
            return { title: item.title, url: item.url }
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
          title={item.title}
          actions={
            <ActionPanel>
              <Action.Push title="Show Details" target={<Detail markdown={item.url} />} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
