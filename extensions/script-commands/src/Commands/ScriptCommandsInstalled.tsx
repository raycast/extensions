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

import { 
  ViewState 
} from "@types"

const dataManager = DataManager.shared()

export function ScriptCommandsInstalledList(): JSX.Element  {
  const [state, setState] = useState<ViewState>({ needsReload: true })

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

  let placeholder = "There's no Script Commands installed"
  
  if (content.totalScriptCommands > 0)
    placeholder = `Search between ${content.totalScriptCommands} installed`

  return (
    <MainContent 
      navigationTitle="List Commands Installed"
      placeholder={ placeholder }
      isLoading={ content.groups.length == 0 } 
      groups={ content.groups } 
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
