import { 
  createContext,
  useState,
  ReactNode
} from "react"

import { 
  DataManager 
} from "@managers"

import { 
  Filter 
} from "@types"

type ProviderState = {
  dataManager: DataManager
  filter: Filter
}

type ContextType = {
  state: ProviderState
  setFilter: (filter: Filter) => void
}

const initialState: ProviderState = {
  dataManager: DataManager.shared(),
  filter: null,
}

export const ApplicationContext = createContext<ContextType>({
  state: initialState,
  setFilter: () => { return }
})

type Props = {
  children: ReactNode
}

export const ApplicationProvider = ({ children }: Props) => {
  const [state, ] = useState<ProviderState>(initialState)
  const [filter, setFilter] = useState<Filter>(null)

  return (
    <ApplicationContext.Provider 
      value={{ 
        state: {
          dataManager: state.dataManager,
          filter,
        },
        setFilter 
      }}
      children={ children }
    />
  )
}