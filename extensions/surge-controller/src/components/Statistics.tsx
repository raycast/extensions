import bytes from 'bytes'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { List } from '@raycast/api'
import { TrafficT } from '../utils/types'
import { getTraffic } from '../api'

const Statistics = () => {
  const {
    response: traffic,
    error,
    loading,
  } = useRequire<TrafficT>({
    apiLoader: getTraffic,
    defaultData: [],
    refetchInterval: 2000,
  })

  return (
    <List isLoading={loading} isShowingDetail navigationTitle="Statistics">
      <ErrorBoundary error={error}>
        {traffic.map(
          ({ name: proxy, in: _in, out, inCurrentSpeed, outCurrentSpeed, inMaxSpeed, outMaxSpeed }) => {
            const content = `
## Total: ${bytes(out + _in)}
### Traffic: 
> ↑ ${bytes(out)} | ↓ ${bytes(_in)}
### Current Speed:
> ↑ ${bytes(outCurrentSpeed)}/s | ↓ ${bytes(inCurrentSpeed)}/s
### Maximum Speed: 
> ↑ ${bytes(outMaxSpeed)}/s | ↓ ${bytes(inMaxSpeed)}/s
`

            return <List.Item key={proxy} title={proxy} detail={<List.Item.Detail markdown={content} />} />
          },
        )}
      </ErrorBoundary>
    </List>
  )
}

export default Statistics
