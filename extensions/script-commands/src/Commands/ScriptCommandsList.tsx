import { 
  MainContent 
} from "@components"

import {
   ApplicationProvider
 } from "@providers"
import { useScriptCommands } from "Providers/DataManagerProvider"

export function ScriptCommandsList(): JSX.Element {
  const { main } = useScriptCommands()  

  console.log(`Called List: ${main.groups.length} - TSC: ${main.totalScriptCommands}`)

  return (
    <ApplicationProvider>
      <MainContent 
        navigationTitle="Search Command"
        placeholder={`Search for your Script Command among of ${main.totalScriptCommands} items`}
        isLoading={main.groups.length == 0} 
        groups={main.groups} 
        showSearchListAction={ false }
      />
    </ApplicationProvider>
  )
}
