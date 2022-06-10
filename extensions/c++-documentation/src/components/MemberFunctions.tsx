import { ActionPanel, List, Detail, Action, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from 'react'
import { getMemberFunctions, getDetails } from '../api'

export const MemberFunctions = (props: {
    url: string
    setLoading: (loading: boolean) => void
}) => {
  const [functionSections, setFunctionSections]:any = useState([])

  const getFunctionsDetail = async (sections:any) => {
    var start_time = new Date().getTime()
    Promise.all(sections.map(section => {
      return Promise.all(section.functions.map(func => {
        return getDetails(func)
      }
    ))}))
    .then(() => {
      console.log("getFunctionsDetail: " + (new Date().getTime() - start_time) / 1000 + "s")
      props.setLoading(false)
    })
    .catch((err) => {
      showToast(Toast.Style.Failure, err.message)
    })
  }

  useEffect(() => {
    getMemberFunctions(props.url)
      .then((sections) => {
        setFunctionSections(sections)
        //getFunctionsDetail(sections)
        props.setLoading(false)
      })
      .catch((err) => {
        showToast(Toast.Style.Failure, err.message)
      })
    return () => {
      setFunctionSections([])
    }
  }, [])

  // return (
  //   <List.Item title="test"/>
  // )

  return (
    functionSections ? functionSections.map((section, section_index) => {
      return (section.title !== "" ? 
        <List.Section 
          title={section.title}
          key={section_index}
        >
          {section.functions.map((func, index) => (
            <FunctionComponent func={func} key={index}/>
          ))}
        </List.Section> : 
        section.functions.map((func, index) => (
          <FunctionComponent func={func} key={index}/>
        ))
      )
    })
  : undefined)
}

// shows the member function details
const FunctionComponent = (props: {
  func: any, 
}) => {
  return (
    <List.Item
      title={props.func.name}
      //subtitle={props.func.description ? props.func.description : ""}
      detail={
        <FunctionDetail func={props.func}/>
      }
      actions={props.func.url && 
        <ActionPanel>
          <Action.OpenInBrowser 
            title="Open in Browser" 
            icon={{ source: "../assets/cpp-icon.png", tintColor: Color.PrimaryText }}
            url={`https://en.cppreference.com${props.func.url}`} 
          />
        </ActionPanel>
      }
    />
  )
}

const FunctionDetail = (props: {
  func: any,
}) => {
  // const [markdown, setMarkdown]:any = useState(
  //   `# ${props.func.name}\n\n\`\`\`\n${props.func.name}\n\`\`\`\n${props.func.description}`
  // )

  // const [parameters, setParameters]:any = useState([
  //   "alloc : allocator to use for all memory allocations of this container",
  //   "count : the size of the container",
  //   "value : the value to initialize elements of the container with",
  //   "first, last : the range to copy the elements from",
  //   "other : another container to be used as source to initialize the elements of the container with",
  //   "init : initializer list to initialize the elements of the container with",
  // ])

  return (
    <List.Item.Detail 
      markdown={props.func.markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Parameters"
            icon={{ source: "../assets/parameters.png", tintColor: Color.SecondaryText }}
          />
          <List.Item.Detail.Metadata.Separator/>
          {props.func.parameters?.map((param, index) => (
            <List.Item.Detail.Metadata.Label 
              title={param}
              key={index}
            />
          ))}
          <List.Item.Detail.Metadata.Label
            title="Return Type"
            icon={{ source: "../assets/return.png", tintColor: Color.SecondaryText }}
          />
          <List.Item.Detail.Metadata.Separator/>
        </List.Item.Detail.Metadata>
      }
    />
  )
}