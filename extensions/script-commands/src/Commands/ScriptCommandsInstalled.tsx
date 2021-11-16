import { 
  useState, 
  useEffect 
} from "react"

import { 
  Main 
} from "@models"

import { 
  DataManager 
} from "@managers"

import { 
  MainContent 
} from "@components"

type State = { 
  needsReload: boolean 
}

const dataManager = DataManager.shared()

export function ScriptCommandsInstalledList() {
  const [state, setState] = useState<State>({ needsReload: true })

  const [content, setContent] = useState<Main>({ 
    groups: [],
    totalScriptCommands: 0
  })

  useEffect(() => {
    async function fetch() {
      const response = await dataManager.fetchInstalledCommands()

      setContent(oldState => ({
        ...oldState,
        groups: response.groups,
        totalScriptCommands: response.totalScriptCommands
      }))
    }

    fetch()
  }, [state])

  return (
    <MainContent 
      navigationTitle="List Commands Installed"
      placeholder={`Search between ${content.totalScriptCommands} installed`}
      isLoading={ content.groups.length == 0 } 
      groups={ content.groups } 
      totalScriptCommands={ content.totalScriptCommands }
      showSearchListAction={ content.totalScriptCommands == 0}
      onAction={ 
        () => {
          setState(oldState => ({
            ...oldState, 
            needsReload: true 
          }))
      }}
    />
  )
}
