import { Action, ActionPanel, Icon, List } from '@raycast/api'
import { FC, useMemo, useState } from 'react'
import { Shortcuts } from '../../constants/shortcut'
import { GrafanaDashboards, GrafanaSimpleFolders } from '../../apis/types/grafana.type'
import { buildGrafanaClient, GrafanaClient } from '../../apis/grafana'
import { withConfig } from '../../utils/configurationCenter'
import { useCachedPromise } from '@raycast/utils'

export const GrafanaCommand: FC = withConfig(({ configurations: { grafanaBaseUrl, grafanaPAT } }) => {
  const [keyword, setKeyword] = useState('')
  const [selectedFolder, setFolder] = useState('')
  const grafanaClient = useMemo(() => buildGrafanaClient(grafanaBaseUrl, grafanaPAT), [grafanaBaseUrl, grafanaPAT])

  const { data: folders = [] as GrafanaSimpleFolders } = useCachedPromise(
    async (client: GrafanaClient) => {
      const { data } = await client.fetchAllFolders()
      return data
    },
    [grafanaClient]
  )

  const { isLoading, data: dashboardMap = {} } = useCachedPromise(
    async (folders: GrafanaSimpleFolders, client: GrafanaClient) => {
      const results = {} as Record<string, GrafanaDashboards>
      for (const folder of folders) {
        console.log('fetch dashboard', folder.title)
        const { data } = await client.fetchDashboardByFolder(folder.id)
        results[folder.title] = data
      }
      return results
    },
    [folders, grafanaClient]
  )

  return (
    <List
      searchText={keyword}
      onSearchTextChange={setKeyword}
      isLoading={isLoading}
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
          const dashboards = dashboardMap[folder.title]
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
                            url={`${grafanaBaseUrl}${board.url}`}
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
})
