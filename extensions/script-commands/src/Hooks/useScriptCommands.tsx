import { 
  useState,
  useEffect
} from "react"

import { 
  useDataManager
} from "@hooks"

import { 
  Group,
  Main,
} from "@models"

type UseScriptCommandsState = {
  shouldReload: boolean,
  main: Main
}

type UserScriptCommandsProps = {
  title: string,
  placeholder: string,
  isLoading: boolean,
  groups: Group[]
}

type UseScriptCommands = () => {
  props: UserScriptCommandsProps
  reloadData: () => void
}

export const useScriptCommands: UseScriptCommands = () => {
  const { dataManager } = useDataManager()
  
  const [state, setState] = useState<UseScriptCommandsState>({
    shouldReload: true, 
    main: { 
      groups: [],
      totalScriptCommands: 0,
      languages: []
    }
  })

  const reloadData = () => {
    setState((oldState) => ({
      ...oldState, 
      shouldReload: true
    }))
  }

  useEffect(() => {    
    async function fetch() {
      const response = await dataManager.fetchCommands()
      
      setState({
        shouldReload: false, 
        main: response
      })
    }

    if (state.shouldReload == false)
      return

    fetch()
  }, [state])

  const isLoading = state.main.groups.length == 0
  let placeholder = "Loading Script Commands..."

  if (isLoading == false)
    placeholder = `Search for your Script Command among of ${state.main.totalScriptCommands} items`

  return {
    props: {
      title: "Search Command",
      placeholder: placeholder,
      isLoading: isLoading,
      groups: state.main.groups
    },
    reloadData
  }
}