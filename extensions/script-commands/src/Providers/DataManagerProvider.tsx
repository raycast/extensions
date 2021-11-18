
import { 
  DataManager 
} from "@managers"

import { 
  Group,
  Main,
  ScriptCommand
} from "@models"
import { INITIAL_STATE } from "@raycast/api"

import { 
  StateResult,
  State
} from "@types"

import { 
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState, 
} from "react"

type ApplicationState = {
  dataManager: DataManager
}

type ApplicationContextType = {
  state: ApplicationState

}

const INITIAL_APPLICATION_STATE: ApplicationState = {
  dataManager: DataManager.shared()
}

export const ApplicationContext = createContext<ApplicationContextType>({
  state: INITIAL_APPLICATION_STATE
})

/************/

type Props = {
  children: ReactNode
}
export const ApplicationProvider = ({children}: Props) => {
  const [state, ] = useState<ApplicationState>(INITIAL_APPLICATION_STATE)
  return (<ApplicationContext.Provider value={{state}}>{children}</ApplicationContext.Provider>)
}

/************/

type UseDataManager = () => {dataManager: DataManager}
export const useDataManager: UseDataManager = () => {
  const {state} = useContext(ApplicationContext)
  return {dataManager: state.dataManager}
}

/************/
type UseScriptCommandsState = {
  shouldReload: boolean,
  main: Main
}
type UseScriptCommands = () => {main: Main, reloadData: () => void}
export const useScriptCommands: UseScriptCommands = () => {
  // const [state, setState] = useState(true)
  const {dataManager} = useDataManager()
  const [state, setState] = useState<UseScriptCommandsState>({shouldReload: true, main: { 
    groups: [],
    totalScriptCommands: 0
  }})

  // const [main, setMain] = useState<Main>()

  const reloadData = () => {
    setState((oldState) => ({...oldState, shouldReload: true}))
  }

  useEffect(() => {    
    console.log("useScriptCommands - useEffect")

    async function fetch() {
      const response = await dataManager.fetchCommands()
      
      console.log("useScriptCommands - useEffect - setMain " + response.totalScriptCommands)
      setState({shouldReload: false, main: response})
    }
    if (state.shouldReload == false)
      return

    fetch()
  }, [state])

  

  
  return {main: state.main, reloadData}
}

/************/

// interface ContextProps {
//   stateFor(scriptCommand: ScriptCommand): State 

//   fetchSourceCode(scriptCommand: ScriptCommand): Promise<string>
//   fetchInstalledCommands(): Promise<Main> 

//   installScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult>
//   deleteScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult> 
// }

// export function DataManagerProvider({ children }: ProviderProps): JSX.Element {
//   const dataManager = DataManager.shared()

//   function stateFor(scriptCommand: ScriptCommand): State {
//     return dataManager.stateFor(scriptCommand)
//   }

//   async function fetchSourceCode(scriptCommand: ScriptCommand): Promise<string> {
//     return dataManager.fetchSourceCode(scriptCommand)
//   }

//   async function fetchInstalledCommands(): Promise<Main> {
//     return dataManager.fetchInstalledCommands()
//   }

//   async function installScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult> { 
//     return dataManager.installScriptCommand(scriptCommand)
//   }

//   async function deleteScriptCommand(scriptCommand: ScriptCommand): Promise<StateResult>  { 
//     return dataManager.deleteScriptCommand(scriptCommand)
//   }

//   return (
//     <DataManagerContext.Provider 
//       value={{ 
//         stateFor,
//         fetchSourceCode,
//         fetchInstalledCommands,
//         installScriptCommand,
//         deleteScriptCommand
//       }}
//     >
//       { children }
//     </DataManagerContext.Provider>
//   )
// }

// const DataManagerContext = createContext<ContextProps | undefined>(undefined)

// export const useDataManager = (): ContextProps => {
//   const context = useContext(DataManagerContext)

//   if (context == undefined)
//     throw new Error("useDataManager must be inside a DataManagerProvider")

//   return context
// }