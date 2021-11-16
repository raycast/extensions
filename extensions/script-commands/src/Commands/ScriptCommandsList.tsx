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

const dataManager = DataManager.shared()

export function ScriptCommandsList() {
  const [content, setContent] = useState<Main>({ 
    groups: [],
    totalScriptCommands: 0
  })

  useEffect(() => {
    async function fetch() {
      const response = await dataManager.fetchCommands()

      setContent(oldState => ({
        ...oldState,
        groups: response.groups,
        totalScriptCommands: response.totalScriptCommands
      }))
    }

    fetch()
  }, [])

  return (
    <MainContent 
      navigationTitle="Search Command"
      placeholder={`Search for your Script Command among of ${content.totalScriptCommands} items`}
      isLoading={content.groups.length == 0} 
      groups={content.groups} 
      showSearchListAction={ false }
    />
  )
}
