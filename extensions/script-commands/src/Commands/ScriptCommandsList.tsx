import { 
  MainContent 
} from "@components"

import { 
  useScriptCommands
} from "@hooks"

import {
   ApplicationProvider
} from "@providers"

export function ScriptCommandsList(): JSX.Element {
  const { props } = useScriptCommands()  
  
  return (
    <ApplicationProvider>
      <MainContent 
        navigationTitle={ props.title }
        placeholder={ props.placeholder}
        isLoading={ props.isLoading } 
        groups={ props.groups} 
      />
    </ApplicationProvider>
  )
}
