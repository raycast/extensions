import { List } from "@raycast/api"
import { useState, useEffect } from "react"
import axios from "axios"
import matter from "gray-matter"
import { Buffer } from "buffer"

interface ISnippet {
  content: string
  encoding: string
}

const SnippetContent = ({ categoryName, name }: { categoryName: string; name: string }) => {
  const [snippet, setSnippet] = useState<ISnippet>()

  useEffect(() => {
    const fetchSnippet = async () => {
      const { data } = await axios.get(
        `https://api.github.com/repositories/251039251/contents/snippets/${categoryName}/${name}`
      )

      setSnippet(data)
    }

    fetchSnippet()
  }, [])

  // const markdown = matter(Buffer.from(snippet.content, snippet.encoding).toString("ascii"))
  const getMarkdown = () => {
    if (!snippet) {
      return "Loading…"
    }
    const parsed = matter(Buffer.from(snippet.content, "base64").toString("ascii"))

    return `# [${parsed.data.category}] ${parsed.data.title} ${parsed.content}`
  }

  return <List.Item.Detail isLoading={!snippet} markdown={getMarkdown()} />
}

export default SnippetContent
