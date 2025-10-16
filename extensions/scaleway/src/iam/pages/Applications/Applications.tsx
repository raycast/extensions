import { Action, ActionPanel, List } from '@raycast/api'
import { useReducer } from 'react'
import { useAllApplicationsQuery } from '../../queries'
import { Application } from './Application'

export const Applications = () => {
  const [isDetailOpen, toggleIsDetailOpen] = useReducer((state) => !state, false)

  const { data: applications = [], isLoading } = useAllApplicationsQuery({
    orderBy: 'created_at_desc',
  })

  const isListLoading = isLoading && !applications

  return (
    <List
      isLoading={isListLoading}
      isShowingDetail={isDetailOpen}
      searchBarPlaceholder="Search Applications …"
    >
      {applications.map((application) => (
        <List.Item
          key={application.id}
          title={application.name}
          subtitle={application.description}
          icon={{
            source: {
              dark: 'iam-application@dark.svg',
              light: 'iam-application@light.svg',
            },
          }}
          detail={<Application application={application} />}
          actions={
            <ActionPanel>
              <Action title="More Information" onAction={toggleIsDetailOpen} />
            </ActionPanel>
          }
        />
      ))}

      <List.EmptyView title="No Applications found" />
    </List>
  )
}
