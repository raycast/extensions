import { 
  useState,
  useEffect
} from "react"

import { 
  useDataManager
} from "@hooks"

import { 
  CompactGroup, 
  MainCompactGroup,
} from "@models"

import { 
  Filter, 
  Progress, 
  State 
} from "@types"

import { 
  StoreToast 
} from "@components"

import { 
  Toast 
} from "@raycast/api"

type UseScriptCommandsState = {
  main: MainCompactGroup
}

type UserScriptCommandsProps = {
  placeholder: string,
  isLoading: boolean,
  groups: CompactGroup[]
  totalScriptCommands: number
  filter: Filter
}

type UseScriptCommands = () => {
  props: UserScriptCommandsProps
  setFilter: (filter: Filter) => void
  setSelection:(identifier?: string) => void
}

export const useScriptCommands: UseScriptCommands = () => {
  let toast: Toast | null

  const { dataManager, filter, setFilter } = useDataManager()
  
  const [state, setState] = useState<UseScriptCommandsState>({
    main: { 
      groups: [],
      totalScriptCommands: 0,
      languages: []
    }
  })

  const setSelection = async (identifier?: string) => {
    if (!identifier) {
      return
    }

    const commandState = dataManager.stateFor(identifier)

    if (commandState === State.ChangesDetected || commandState === State.NeedSetup) {
      toast = await StoreToast(commandState, Progress.Finished)
    }
    else if (toast) {
      toast.hide()
    }
  }

  useEffect(() => {    
    async function fetch() {
      const response = await dataManager.fetchCommands(filter)
      
      setState({
        main: response
      })
    }
    
    fetch()
  }, [filter])

  const isLoading = state.main.groups.length === 0
  let placeholder = "Loading Script Commands..."

  if (!isLoading) {
    if (filter) {
      placeholder = `Filter applied: ${filterDescription(filter)} (${state.main.totalScriptCommands})`
    }
    else {
      placeholder = `Search by name, category, or author in ${state.main.totalScriptCommands} items`
    }
  }

  return {
    props: {
      placeholder: placeholder,
      isLoading: isLoading,
      groups: state.main.groups,
      totalScriptCommands: state.main.totalScriptCommands,
      filter: filter
    },
    setFilter,
    setSelection
  }
}

type FilterDescription = (filter: Filter) => string | null

const filterDescription: FilterDescription = (filter) => {
  if (filter == null) {
    return null
  }
  
  if (typeof(filter) == "string") { 
    return filter
  }

  switch (filter) {
    case State.Installed:
      return "Installed"

    case State.NeedSetup:
      return "Need Setup"
  }

  return null
}