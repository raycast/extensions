import {
  ActionPanel,
  CopyToClipboardAction,
  Icon,
  Image,
  KeyboardShortcut,
  List,
  OpenAction,
  OpenInBrowserAction,
  // OpenWithAction,
  showToast,
  ToastStyle,
  TrashAction
} from "@raycast/api"

import { useState, useEffect, ReactElement } from "react"
import { Cache, gitRemotes, loadSettings, Settings, tildifyPath, useRepoCache } from "./utils"

export default function Main(): ReactElement {
  const [settings, setSettings] = useState<Settings>()
  const [searchText, setSearchText] = useState<string>()
  const { response, error, isLoading } = useRepoCache(searchText)
  const [selectedItem, setSelectedItem] = useState<string>()

  if (error) {
    showToast(ToastStyle.Failure, "", error)
  }

  useEffect(() => {
    loadSettings().then(setSettings)
  }, [])

  function onTrash(path: string) {
    const foundIndex = response?.repos.findIndex((repo) => repo.fullPath === path)
    if (foundIndex != undefined && foundIndex > -1) {
      response?.repos.splice(foundIndex, 1)
      const cache = new Cache()
      cache.repos = response?.repos ?? []
      cache.save()
      setSelectedItem(undefined)
    }
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoading}
      onSelectionChange={setSelectedItem}
    >
      <List.Section title={response?.sectionTitle} >
        {response?.repos?.map((repo) => (
          <List.Item
            key={repo.fullPath}
            id={repo.fullPath}
            title={repo.name}
            icon={repo.icon}
            accessoryTitle={tildifyPath(repo.fullPath)}
            keywords={[repo.name]}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Custom actions">
                  { createCustomActions(settings, repo.fullPath) }
                </ActionPanel.Section>
                <ActionPanel.Section>
                  {gitRemotes(repo.fullPath)
                    .map((remote) => {
                      let shortcut = undefined as KeyboardShortcut | undefined
                      switch (remote.name) {
                        case "origin":
                          shortcut = { modifiers: ["cmd"], key: "o" }
                          break
                        case "upstream":
                          shortcut = { modifiers: ["cmd"], key: "u" }
                          break

                        default:
                          break
                      }

                      let icon = undefined as Image | undefined
                      switch (remote.host) {
                        case "github.com":
                          icon = { source: { dark: "github-icon-dark.png", light: "github-icon-light.png" } }
                          break
                        case "gitlab.com":
                          icon = { source: { dark: "gitlab-icon-dark.png", light: "gitlab-icon-light.png" } }
                          break
                        case "bitbucket.org":
                          icon = { source: { dark: "bitbucket-icon-dark.png", light: "bitbucket-icon-light.png" } }
                          break

                        default:
                          break
                      }
                      return (
                        <OpenInBrowserAction
                          title={`Open on ${remote.host} (${remote.name})`}
                          key={`open remote ${remote.name}`}
                          url={remote.url}
                          shortcut={shortcut}
                          icon={icon != undefined ? icon : Icon.Globe}
                        />
                      )
                    })
                  }
                  {/* <OpenWithAction path={repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "o" }} /> */}
                  <CopyToClipboardAction title={"Copy Path to Clipboard"} content={repo.fullPath} shortcut={{ modifiers: ["cmd"], key: "p" }} />
                  {selectedItem === repo.fullPath ?
                    <TrashAction icon={Icon.Trash} paths={repo.fullPath} onTrash={onTrash} shortcut={{ modifiers: ["ctrl"], key: "x" }}/>
                  : null}
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  )
}

function createCustomActions(settings: Settings | undefined, path: string) {
  if (settings === undefined) {
    return
  }
  const actions = settings.customActions.map((action, index) => {
    let shortcut: KeyboardShortcut = { modifiers: ["opt"], key: "return" }
    switch (index) {
      case 0:
        shortcut = { modifiers: [], key: "return" }
        break
      case 1:
        shortcut = { modifiers: ["cmd"], key: "return" }
        break
      case 2:
        shortcut = { modifiers: ["opt"], key: "return" }
        break
      case 3:
        shortcut = { modifiers: ["ctrl"], key: "return" }
        break
      case 4:
        shortcut = { modifiers: ["shift"], key: "return" }
        break

      default:
        break
    }
    if (action.appPath.length > 0) {
      return (
        <OpenAction
          key={index}
          title={action.title.length > 0 ? action.title : `Open in ${action.app}`}
          icon={{ fileIcon: action.appPath }}
          application={action.app}
          target={path}
          shortcut={shortcut}
        />
      )
    }
  })
  return (
    <>
      {actions}
    </>
  )
}
