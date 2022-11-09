import { ActionPanel, Color, Icon, List } from '@raycast/api'
import { Container, ContainerLog } from '../scaleway/types'
import { useEffect, useState } from 'react'
import { catchError, ScalewayAPI } from '../scaleway/api'
import { ContainersAPI } from '../scaleway/containers-api'

interface ContainersState {
  isLoading: boolean
  logs: ContainerLog[]
  error?: unknown
}

export default function ContainerLogs(props: { container: Container }) {
  useEffect(() => {
    async function fetchLogs() {
      setState((previous) => ({ ...previous, isLoading: true }))

      try {
        const logs = await ContainersAPI.getContainerLogs(props.container)

        setState((previous) => ({ ...previous, logs, isLoading: false }))
      } catch (error) {
        await catchError(error)
        setState((previous) => ({
          ...previous,
          error: error instanceof Error ? error : new Error('Something went wrong'),
          logs: [],
          isLoading: false,
        }))
      }
    }

    fetchLogs().then()
  }, [])

  const [state, setState] = useState<ContainersState>({ logs: [], isLoading: true })

  return (
    <List
      isShowingDetail
      isLoading={state.isLoading}
      searchBarPlaceholder={'Filter logs by content...'}
      navigationTitle={props.container.name}
    >
      {state.logs.map((log) => (
        <List.Item
          key={log.id}
          title={log.message}
          keywords={[log.level, log.source]}
          icon={
            log.level === 'error' || log.stream === 'stderr'
              ? { source: Icon.Warning, tintColor: Color.Red }
              : { source: Icon.Info }
          }
          detail={
            <List.Item.Detail
              markdown={getLogMarkdown(log)}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Timestamp"
                    text={new Date(log.timestamp).toLocaleString('en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'long',
                    })}
                  />
                  {log.level && <List.Item.Detail.Metadata.Label title="Level" text={log.level} />}
                  {log.source && (
                    <List.Item.Detail.Metadata.Label title="Source" text={log.source} />
                  )}
                  {log.stream && (
                    <List.Item.Detail.Metadata.Label
                      title="Stream"
                      text={log.stream}
                      icon={
                        log.stream === 'stderr'
                          ? { source: Icon.Warning, tintColor: Color.Red }
                          : { source: Icon.Info }
                      }
                    />
                  )}
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <ActionPanel.Item.CopyToClipboard title="Copy Content" content={log.message} />
              <ActionPanel.Item.OpenInBrowser url={getLoggingContainerUrl(props.container)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getLoggingContainerUrl(container: Container) {
  return `${ScalewayAPI.CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespace_id}/containers/${container.id}/logging`
}

function getLogMarkdown(log: ContainerLog) {
  try {
    return '```\n' + JSON.stringify(JSON.parse(log.message), null, '\t') + '\n```'
  } catch {
    return '```\n' + log.message + '\n```'
  }
}
