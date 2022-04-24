import bytes from 'bytes'
import dayjs from 'dayjs'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { ActionPanel, Action, List, Detail } from '@raycast/api'
import { useCallback, useEffect, useState } from 'react'
import { getRencentRequest, getActiveRequest, getDevices } from '../api'
import { getCurrentBackend, getProcessData, getRequestStatus, IconRequest } from '../utils'
import { ApiLoaderType, DevicesT, RequestItemT, RequestsT } from '../utils/types'

const Requests = () => {
  const [requestType, setRequestType] = useState('recent')
  const [currentUrl, setCurrentUrl] = useState('')
  const requestLoader = useCallback<ApiLoaderType>(
    () => (requestType === 'recent' ? getRencentRequest() : getActiveRequest()),
    [requestType],
  )
  const {
    response: requestList,
    error,
    loading,
  } = useRequire<RequestsT>({
    apiLoader: requestLoader,
    defaultData: [],
    refetchInterval: 1000,
  })

  const { response: devicesList } = useRequire<DevicesT>({
    apiLoader: getDevices,
    defaultData: [],
  })

  useEffect(() => {
    ;(async () => {
      const { url } = await getCurrentBackend()
      setCurrentUrl(url)
    })()
  }, [])

  return (
    <List
      isLoading={loading}
      navigationTitle="Requests"
      searchBarAccessory={
        <List.Dropdown tooltip="Select Request Type" value={requestType} onChange={setRequestType}>
          <List.Dropdown.Item title="Recent" value="recent" />
          <List.Dropdown.Item title="Active" value="active" />
        </List.Dropdown>
      }
    >
      <ErrorBoundary error={error}>
        {requestList.map((request, i) => (
          <List.Item
            key={i}
            title={request.URL}
            subtitle={request.method}
            icon={IconRequest(request.completed, request.failed)}
            accessories={[
              { text: request.policyName, tooltip: 'Policy Name' },
              { text: getRequestStatus(request), tooltip: 'Status' },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Show Detail"
                  target={
                    <RequestDetail request={request} devicesList={devicesList} currentUrl={currentUrl} />
                  }
                />
              </ActionPanel>
            }
          />
        ))}
      </ErrorBoundary>
    </List>
  )
}

type Props = { request: RequestItemT; devicesList: DevicesT; currentUrl: string }

const RequestDetail = ({ request, devicesList, currentUrl }: Props) => {
  const content = `
## ${request.URL}
- Date: ${dayjs.unix(request.startDate).format('L LTS')}
${
  request.completed
    ? `- Duration: ${dayjs.unix(request.completedDate).diff(dayjs.unix(request.startDate))} ms`
    : ''
}

${
  request.localAddress
    ? `### IP Address
- Local: ${request.localAddress}
- Remote: ${request.remoteAddress}
`
    : ''
}

${
  request.timingRecords
    ? `
### Timing
${request.timingRecords
  .map(({ name, durationInMillisecond }) => `- ${name} ${durationInMillisecond} ms`)
  .join('\n')}
`
    : ''
}

${
  request.notes
    ? `
### Remark
\`\`\`
${request.notes.join('\n')}
\`\`\`
`
    : ''
}

${
  request.requestHeader
    ? `
### Request Header
\`\`\`
${request.requestHeader}
\`\`\`
`
    : ''
}

${
  request.responseHeader
    ? `
### Response Header
\`\`\`
${request.responseHeader}
\`\`\`
`
    : ''
}

`
  const processData = getProcessData(request, devicesList, currentUrl)

  return (
    <Detail
      markdown={content}
      navigationTitle="Request Detail"
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.TagList title="Method  |  Mode  |  Status">
            <Detail.Metadata.TagList.Item text={request.method} color={'#a55eea'} />
            <Detail.Metadata.TagList.Item text={request.proxyMode ? 'Proxy' : 'TUN'} color={'#00a8ff'} />
            <Detail.Metadata.TagList.Item
              text={getRequestStatus(request)}
              color={request.completed ? (request.failed ? '#ff4757' : '#32ff7e') : '#eed535'}
            />
          </Detail.Metadata.TagList>
          <Detail.Metadata.Label title="Policy Name" text={request.policyName} />
          <Detail.Metadata.Label title="Rule" text={request.rule} />
          <Detail.Metadata.Label title={processData.title} icon={processData.icon} text={processData.text} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Traffic"
            text={`↑ ${bytes(request.outBytes)}  |  ↓ ${bytes(request.inBytes)}`}
          />
          <Detail.Metadata.Label
            title="Maximum Speed"
            text={`↑ ${bytes(request.outMaxSpeed)}/s  |  ↓ ${bytes(request.inMaxSpeed)}/s`}
          />
        </Detail.Metadata>
      }
    />
  )
}

export default Requests
