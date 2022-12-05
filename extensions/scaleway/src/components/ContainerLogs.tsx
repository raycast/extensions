import { ActionPanel, Color, Icon, List } from '@raycast/api'
import { Container } from '@scaleway/sdk'
import { useCachedPromise } from '@raycast/utils'
import { CONSOLE_URL, getScalewayClient } from '../api/client'

export default function ContainerLogs({ container }: { container: Container.v1beta1.Container }) {
  const api = new Container.v1beta1.API(getScalewayClient())

  const {
    data: logs,
    isLoading,
    revalidate,
  } = useCachedPromise(
    async () => {
      return (await api.listLogs({ containerId: container.id, region: container.region })).logs
    },
    [],
    { initialData: [] }
  )

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder={'Filter logs by content...'}
      navigationTitle={container.name}
    >
      {logs.map((log) => (
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
                    text={
                      log.timestamp?.toLocaleString('en-US', {
                        dateStyle: 'medium',
                        timeStyle: 'long',
                      }) || 'unknown'
                    }
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
              <ActionPanel.Item.OpenInBrowser url={getLoggingContainerUrl(container)} />
              <ActionPanel.Item
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={() => revalidate()}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}

function getLoggingContainerUrl(container: Container.v1beta1.Container) {
  return `${CONSOLE_URL}/containers/namespaces/${container.region}/${container.namespaceId}/containers/${container.id}/logging`
}

function getLogMarkdown(log: Container.v1beta1.Log) {
  try {
    return '```\n' + JSON.stringify(JSON.parse(log.message), null, '\t') + '\n```'
  } catch {
    return '```\n' + log.message + '\n```'
  }
}
