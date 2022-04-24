import dayjs from 'dayjs'
import useRequire from '../hooks/useRequire'
import ErrorBoundary from './ErrorBoundary'
import { List } from '@raycast/api'
import { getEvents } from '../api'
import { getEventTypeByNum, IconEvent } from '../utils'
import { EventsT } from '../utils/types'

const Events = () => {
  const {
    response: eventList,
    error,
    loading,
  } = useRequire<EventsT>({
    apiLoader: getEvents,
    defaultData: [],
  })

  return (
    <List isLoading={loading} navigationTitle="Events">
      <ErrorBoundary error={error}>
        {eventList.map(({ content, date, type, identifier }) => (
          <List.Section
            key={identifier}
            title={getEventTypeByNum(type)}
            subtitle={dayjs(date).format('L LTS')}
          >
            <List.Item title={content} icon={IconEvent(type)} />
          </List.Section>
        ))}
      </ErrorBoundary>
    </List>
  )
}

export default Events
