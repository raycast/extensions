import { ActionPanel, List, Detail, Action, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from 'react'
import { getMemberFunctions } from '../api'

export const MemberFunctions = (props: {
    url: string
    setLoading: (loading: boolean) => void
}) => {
  const [functionSections, setFunctionSections]:any = useState([])

  useEffect(() => {
    getMemberFunctions(props.url)
      .then((sections) => {
        setFunctionSections(sections)
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
  const [markdown, setMarkdown]:any = useState(
    `# ${props.func.name}\n\n\`\`\`\n${props.func.name}\n\`\`\`\n${props.func.description}`
  )

  return (
    <List.Item.Detail 
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Parameters"
            
          />
          <List.Item.Detail.Metadata.Separator/>
          <List.Item.Detail.Metadata.Label
            title="Return Type"
          />
          <List.Item.Detail.Metadata.Separator/>
        </List.Item.Detail.Metadata>
      }
    />
  )
}