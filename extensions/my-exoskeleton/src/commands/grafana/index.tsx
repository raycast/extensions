import { Action, ActionPanel, getPreferenceValues, Icon, List } from '@raycast/api'
import { useEffect, useState } from 'react'
import { Shortcuts } from '../../constants/shortcut'
import { GrafanaDashboards, GrafanaPreference, GrafanaSimpleFolders } from '../../apis/types/grafana.type'
import { fetchAllFolders, fetchDashboardByFolder } from '../../apis/grafana'
import { isEmpty } from 'lodash'

export function GrafanaCommand() {
  const { GrafanaBaseUrl } = getPreferenceValues<GrafanaPreference>()
  const [keyword, setKeyword] = useState('')
  const [folders, setFolders] = useState<GrafanaSimpleFolders>([])
  const [selectedFolder, setFolder] = useState('')

  fetchAllFolders().then((res) => {
    setFolders(res.data)
  })

  useEffect(() => {
    if (!isEmpty(dashboard_mapper)) {
      folders?.forEach((folder) => {
        fetchDashboardByFolder(folder.id).then((res) => {
          dashboard_mapper.set(folder.title, res.data)
        })
      })
    }
  }, [folders])

  const dashboard_mapper: Map<string, GrafanaDashboards> = new Map()

  return (
    <List
      searchText={keyword}
      onSearchTextChange={setKeyword}
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Folders" onChange={setFolder}>
          <List.Dropdown.Item title="All" value="" />
          <List.Dropdown.Section title="Select Folder">
            {folders?.map((folder) => (
              <List.Dropdown.Item title={folder.title} value={folder.title} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {folders
        ?.filter((folder) => folder.title.includes(selectedFolder))
        .map((folder) => {
          const dashboards = dashboard_mapper.get(folder.title)
          return (
            <List.Section title={folder.title}>
              {dashboards
                ?.filter((board) => board.title.toLowerCase().includes(keyword.toLowerCase()))
                .map((board) => {
                  return (
                    <List.Item
                      title={board.title}
                      key={board.title}
                      icon={Icon.Stars}
                      actions={
                        <ActionPanel>
                          <Action.OpenInBrowser
                            title="Open in browser"
                            shortcut={Shortcuts.link}
                            url={`${GrafanaBaseUrl}${board.url}`}
                          />
                        </ActionPanel>
                      }
                    />
                  )
                })}
            </List.Section>
          )
        })}
      ;
    </List>
  )
}
