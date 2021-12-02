import { 
  useDataManager 
} from "@hooks"

import { 
  Filter 
} from "@types"

type UseFilter = () => {
  filter: Filter
  setFilter: (filter: Filter) => void
}

export const useFilter: UseFilter = () => {
  const { filter, setFilter } = useDataManager()
  
  return {
    filter: filter,
    setFilter
  }
}