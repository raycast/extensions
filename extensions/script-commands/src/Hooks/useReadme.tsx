import { 
  useDataManager 
} from "@hooks"

import { 
  CompactGroup,
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
  group: CompactGroup
}

type UseReadmeProps = {
  title: string,
  isLoading: boolean,
  readmeURL: string,
  content: string
}

import path from "path"

type UseReadme = (initialGroup: CompactGroup) => UseReadmeProps

export const useReadme: UseReadme = (initialGroup) => {
  const { dataManager } = useDataManager()
  
  const [state, setState] = useState<ReadmeState>({
    content: "",
    group: initialGroup
  })

  let readmeURL = ""
  const readmePath = state.group.readme
  
  if (readmePath) {
    readmeURL = readmeNormalURL(readmePath)
  }
  
  useEffect(() => {
    let abort = false

    const fetch = async (path: string) => {
      const result = await dataManager.fetchReadme(path)

      if (abort == false) {
        setState((oldState) => ({
          ...oldState, 
          content: result
        }))
      }
    }
    
    if (readmePath) {
      fetch(readmePath)
    }
    
    return () => {
      abort = true
    }
  }, [state])
  
  
  const filename = readmePath ? path.parse(readmePath).base : "README"
  const title = `${state.group.title}'s ${filename}`

  return {
    title: title,
    isLoading: state.content.length == 0,
    readmeURL: readmeURL,
    content: state.content
  }
}
