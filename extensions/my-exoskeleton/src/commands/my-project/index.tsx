import { Action, ActionPanel, List, useNavigation } from '@raycast/api'
import React, { FC, useState } from 'react'
import GoCDPipelines from '../../gocd-pipelines'
import { Shortcuts } from '../../constants/shortcut'
import GrafanaIndex from '../../grafana'
import Bookmark from '../../bookmark'
import { DictionaryCommand } from '../dictionary'
import { DictionaryLoadCommand } from '../dictionary/DictionaryLoad'
import { withConfig } from '../../utils/configurationCenter'
import { SyncConfiguration } from '../sycn-configuration'

export const MyProjectCommand: FC = withConfig(({ configurations }) => {
  const { push } = useNavigation()
  const { grafanaBaseUrl, gocdBaseUrl } = configurations
  const [keyword, setKeyword] = useState('')

  const items = [
    {
      title: 'Dictionary',
      actions: (
        <ActionPanel>
          <Action title="Go to dictionary" onAction={() => push(<DictionaryCommand />)} />
          <Action title="Load dictionary" onAction={() => push(<DictionaryLoadCommand />)} />
        </ActionPanel>
      )
    },
    {
      title: 'GOCD',
      actions: (
        <ActionPanel>
          <Action title="Search Pipelines" onAction={() => push(<GoCDPipelines />)} />
          <Action.OpenInBrowser title="Open GOCD" url={gocdBaseUrl} />
        </ActionPanel>
      )
    },
    {
      title: 'Grafana',
      actions: (
        <ActionPanel>
          <Action title="Search Grafana" onAction={() => push(<GrafanaIndex />)} />
          <Action.OpenInBrowser
            title="Open Grafana"
            shortcut={Shortcuts.link}
            url={`${grafanaBaseUrl}/grafana/?search=open&orgId=1`}
          />
        </ActionPanel>
      )
    },
    {
      title: 'Bookmark',
      actions: (
        <ActionPanel>
          <Action title="Go to bookmark" onAction={() => push(<Bookmark />)} />
        </ActionPanel>
      )
    },
    {
      title: 'Sync Configuration',
      actions: (
        <ActionPanel>
          <Action title="Go to sync configuration" onAction={() => push(<SyncConfiguration />)} />
        </ActionPanel>
      )
    }
  ]

  return (
    <List searchText={keyword} onSearchTextChange={setKeyword}>
      {items
        .filter((i) => i.title.toLowerCase().includes(keyword.toLowerCase()))
        .map((i) => (
          <List.Item title={i.title} actions={i.actions} />
        ))}
    </List>
  )
})
