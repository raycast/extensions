import { ActionPanel, List, Detail, Action, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from 'react'
import { getSections } from '../api'

export const Documentation = (props: {
    url: string
    setLoading: (loading: boolean) => void
  }) => {
    const [sections, setSections]:any = useState([])
    // const [loading, setLoading] = useState(true)
  
    useEffect(() => {
      getSections(props.url)
        .then((sections) => {
          setSections(sections)
          props.setLoading(false)
        })
        .catch((err) => {
          showToast(Toast.Style.Failure, err.message)
        })
        
    }, [])
  
    return (
      sections?.map((section, index) => (
        <List.Item 
          title={section.title}
          key={index}
          actions={
            <ActionPanel>
              <ActionPanel.Section title="Section">
                <Action.Push 
                  title="See Details" 
                  icon={{ source: "../assets/code.png", tintColor: Color.PrimaryText  }}
                  target={
                    <Detail markdown={section.markdown}/>
                  }
                />
              </ActionPanel.Section>
              <ActionPanel.Section title="General">
                <Action.OpenInBrowser 
                  title="Open in Browser" 
                  icon={{ source: "../assets/cpp-icon.png", tintColor: Color.PrimaryText  }}
                  url={`https://en.cppreference.com${props.url}`} 
                  shortcut={{ modifiers: ["cmd"], key: "enter" }}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))
    )
}