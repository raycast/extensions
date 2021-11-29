import { 
  useDataManager 
} from "@hooks"

import { 
  Group,
} from "@models"

import { 
  readmeNormalURL,
} from "@urls"

import { 
  useEffect,
  useState 
} from "react"

type ReadmeState = {
  content: string,
  group: Group
}

type UseReadmeProps = {
  title: string,
  isLoading: boolean,
  readmeURL: string,
  content: string
}

import path from "path"

type UseReadme = (initialGroup: Group) => UseReadmeProps

export const useReadme: UseReadme = (initialGroup) => {
  const { dataManager } = useDataManager()
  
  const [state, setState] = useState<ReadmeState>({
    content: "",
    group: initialGroup
  })


  let readmeURL = ""
  const readmePath = state.group.readme
  
  if (readmePath != undefined && readmePath != "")
    readmeURL = readmeNormalURL(readmePath)
  
  useEffect(() => {
    const fetch = async (path: string) => {
      const result = await dataManager.fetchReadme(path)
      
      setState((oldState) => ({
        ...oldState, 
        content: result
      }))
    }
    
    if (readmePath != undefined && readmePath != "")
      fetch(readmePath)
    
  }, [state])
  
  
  const filename = (readmePath != undefined && readmePath != "") ? path.parse(readmePath).base : "README"
  const title = `${state.group.name}'s ${filename}`

  return {
    title: title,
    isLoading: state.content.length == 0,
    readmeURL: readmeURL,
    content: state.content
  }
}
