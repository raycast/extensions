import { Action, ActionPanel, Color, Icon, List } from '@raycast/api'
import type { Function } from '@scaleway/sdk'
import { useAllLogsQuery } from '../queries'
import { getLoggingFunctionUrl } from '../urls'

type FunctionLogsProps = {
  serverlessFunction: Function.v1beta1.Function
}

const getLogMarkdown = (log: Function.v1beta1.Log) => {
  try {
    return `\`\`\`\n${JSON.stringify(JSON.parse(log.message), null, '\t')}\n\`\`\``
  } catch {
    return `\`\`\`\n${log.message}\n\`\`\``
  }
}

export const FunctionLogs = ({ serverlessFunction }: FunctionLogsProps) => {
  const {
    data: logs,
    isLoading,
    reload,
  } = useAllLogsQuery(
    {
      functionId: serverlessFunction.id,
      region: serverlessFunction.region,
    },
    {
      initialData: [],
    }
  )

  const isListLoading = isLoading && !logs

  return (
    <List
      isShowingDetail
      isLoading={isListLoading}
      searchBarPlaceholder="Filter logs by content..."
      navigationTitle={serverlessFunction.name}
    >
      {(logs || []).map((log) => (
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
              <Action.CopyToClipboard title="Copy Content" content={log.message} />
              <Action.OpenInBrowser url={getLoggingFunctionUrl(serverlessFunction)} />
              <Action
                title="Refresh"
                icon={Icon.RotateClockwise}
                shortcut={{ modifiers: ['cmd'], key: 'r' }}
                onAction={reload}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  )
}
