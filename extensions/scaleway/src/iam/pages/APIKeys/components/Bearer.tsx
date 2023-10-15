import { List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'
import { useApplicationQuery, useUserQuery } from '../../../queries'

type APIKeyProps = {
  apiKey: IAM.v1alpha1.APIKey
}

const User = ({ userId }: { userId: IAM.v1alpha1.User['id'] }) => {
  const { data: user } = useUserQuery({ userId })

  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="User ID"
        text={userId}
        icon={{ source: 'dark/iam-user.svg' }}
      />
      <List.Item.Detail.Metadata.Label
        title="User Email"
        text={user?.email}
        icon={{ source: 'dark/iam-user.svg' }}
      />
    </>
  )
}

const Application = ({ applicationId }: { applicationId: IAM.v1alpha1.Application['id'] }) => {
  const { data: application } = useApplicationQuery({
    applicationId,
  })

  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Application ID"
        text={applicationId}
        icon={{ source: 'dark/iam-application.svg' }}
      />
      <List.Item.Detail.Metadata.Label
        title="Application Name"
        text={application?.name}
        icon={{ source: 'dark/iam-application.svg' }}
      />
    </>
  )
}

export const Bearer = ({ apiKey }: APIKeyProps) => {
  if (apiKey.userId) {
    return <User userId={apiKey.userId} />
  }

  if (apiKey.applicationId) {
    return <Application applicationId={apiKey.applicationId} />
  }

  return null
}
