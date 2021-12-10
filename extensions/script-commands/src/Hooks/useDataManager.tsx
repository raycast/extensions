import { 
  DataManager 
} from "@managers"

import { 
  useContext,
} from "react"

import { 
  ApplicationContext 
} from "@providers"

import { 
  Filter 
} from "@types"

type UseDataManager = () => {
  dataManager: DataManager
  filter: Filter
  setFilter: (filter: Filter) => void
}

export const useDataManager: UseDataManager = () => {
  const { state, setFilter } = useContext(ApplicationContext)
  
  return {
    dataManager: state.dataManager,
    filter: state.filter,
    setFilter
  }
}