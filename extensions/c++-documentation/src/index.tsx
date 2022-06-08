import { ActionPanel, List, Action, showToast, Toast, Color } from "@raycast/api";
import { useState, useEffect } from 'react'
import { getLinks } from './api'
import { Main } from './components/Main'

export default function SearchDocumentation() {
  const [links, setLinks]:any = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLinks()
      .then((links) => {
        setLinks(links)
        setLoading(false)
      })
      .catch((err) => {
        showToast(Toast.Style.Failure, err.message)
      })
  }, [])

  return (
    <List isLoading={loading}>
      {links?.map((link:any, index:number) => (
        <List.Item 
          key={index}
          title={link.text}
          actions={
            <ActionPanel>
              <Action.Push 
                title="See Documentation"
                icon={{ source: "../assets/code.png", tintColor: Color.PrimaryText  }}
                target={
                  <Main url={link.url}/>
                }
              />
              <Action.OpenInBrowser
                title="Open in Browser"
                icon={{ source: "../assets/cpp-icon.png", tintColor: Color.PrimaryText }}
                url={`https://en.cppreference.com${link.url}`}
              />
            </ActionPanel>
          }
        />))
      }
    </List>
  );
}