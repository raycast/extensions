import { ActionPanel, List, PushAction } from "@raycast/api"
import { useState, useEffect } from "react"
import axios from "axios"
import { sentenceCase } from "change-case"

import SnippetContent from "./snippet-content"

interface ISnippet {
  name: string
}

const Snippet = ({ name }: { name: string }) => {
  const [snippets, setSnippets] = useState<ISnippet[]>()

  useEffect(() => {
    const fetchSnippets = async () => {
      const { data } = await axios.get(`https://api.github.com/repositories/251039251/contents/snippets/${name}`)

      setSnippets(data)
    }

    fetchSnippets()
  }, [])

  if (!snippets) {
    return <List isLoading />
  }

  return (
    <List>
      {snippets.map(({ name: snippetName }: ISnippet) => (
        <List.Item
          key={snippetName}
          icon="🗒️"
          title={sentenceCase(snippetName.replace(".md", ""))}
          actions={
            <ActionPanel>
              <PushAction
                title={`Show "${sentenceCase(snippetName.replace(".md", ""))}"`}
                target={<SnippetContent categoryName={name} name={snippetName} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

export default Snippet
