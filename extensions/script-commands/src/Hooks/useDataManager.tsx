import { 
  DataManager 
} from "@managers"

import { 
  useContext,
} from "react"

import { 
  ApplicationContext 
} from "@providers"

type UseDataManager = () => {
  dataManager: DataManager
}

export const useDataManager: UseDataManager = () => {
  const { state } = useContext(ApplicationContext)
  
  return {
    dataManager: state.dataManager
  }
}