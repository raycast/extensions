import { 
  createContext,
  ReactNode,
  useState,
} from "react"

import { 
  DataManager 
} from "@managers"

type State = {
  dataManager: DataManager
}

type ContextType = {
  state: State
}

const initialState: State = {
  dataManager: DataManager.shared()
}

export const ApplicationContext = createContext<ContextType>({
  state: initialState
})

type Props = {
  children: ReactNode
}

export const ApplicationProvider = ({children}: Props) => {
  const [state, ] = useState<State>(initialState)
  
  return (
    <ApplicationContext.Provider 
      value={{state}}
    >
      { children }
    </ApplicationContext.Provider>
  )
}