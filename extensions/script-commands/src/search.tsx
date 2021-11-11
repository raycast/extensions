import { 
  useState, 
  useEffect 
} from "react"

import { 
  DataManager 
} from "@managers"

import { 
  Main 
} from "@models"

import { 
  MainContent 
} from "@components"
import { Detail } from "@raycast/api"

const dataManager = DataManager.shared()

export default function ScriptCommandsList() {
  const [content, setContent] = useState<Main>({ 
    groups: [],
    totalScriptCommands: 0
  })

  useEffect(() => {
    async function fetch() {
      const response = await dataManager.fetchCommands()

      setContent((oldState) => ({
        ...oldState,
        groups: response.groups,
        totalScriptCommands: response.totalScriptCommands
      }))
    }

    fetch()
  }, [])

  return (
    <MainContent 
      isLoading={content.groups.length == 0} 
      groups={content.groups} 
      totalScriptCommands={content.totalScriptCommands}
    />
  )
}
