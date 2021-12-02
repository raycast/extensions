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
  State 
} from "@types"

type UseScriptCommandsState = {
  main: MainCompactGroup
}

type UserScriptCommandsProps = {
  title: string,
  placeholder: string,
  isLoading: boolean,
  groups: CompactGroup[]
  filter: Filter
}

type UseScriptCommands = () => {
  props: UserScriptCommandsProps
  setFilter: (filter: Filter) => void
}

export const useScriptCommands: UseScriptCommands = () => {
  const { dataManager, filter, setFilter } = useDataManager()
  
  const [state, setState] = useState<UseScriptCommandsState>({
    main: { 
      groups: [],
      totalScriptCommands: 0,
      languages: []
    }
  })

  useEffect(() => {    
    async function fetch() {
      const response = await dataManager.fetchCommands(filter)
      
      setState({
        main: response
      })
    }
    
    fetch()
  }, [filter])

  const isLoading = state.main.groups.length == 0
  let placeholder = "Loading Script Commands..."

  if (isLoading == false) {
    if (filter != null) {
      placeholder = `Filter applied: ${filterDescription(filter)} (${state.main.totalScriptCommands})`
    }
    else
      placeholder = `Search for your Script Command among of ${state.main.totalScriptCommands} items`
  }

  return {
    props: {
      title: "Search Command",
      placeholder: placeholder,
      isLoading: isLoading,
      groups: state.main.groups,
      filter: filter
    },
    setFilter
  }
}

type FilterDescription = (filter: Filter) => string | null

const filterDescription: FilterDescription = (filter) => {
  if (filter == null)
    return null
  
  if (typeof(filter) == "string")
    return filter

  switch (filter) {
    case State.Installed:
      return "Installed"

    case State.NeedSetup:
      return "Need Setup"
  }

  return null
}