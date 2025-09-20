import { Color, Icon, List } from '@raycast/api'
import type { IAM } from '@scaleway/sdk'

type UserProps = {
  user: IAM.v1alpha1.User
}

const getStatusIcon = (user: IAM.v1alpha1.User) => {
  if (user.status === 'activated') {
    return {
      source: Icon.CircleFilled,
      tintColor: Color.Green,
    }
  }

  if (user.status === 'invitation_pending') {
    return {
      source: Icon.CircleProgress,
      tintColor: Color.Blue,
    }
  }

  return null
}

export const User = ({ user }: UserProps) => (
  <List.Item.Detail
    metadata={
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Email" text={user.email} />
        <List.Item.Detail.Metadata.Label title="2FA Enabled" text={user.mfa ? 'Yes' : 'No'} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label
          title="Status"
          text={user.status}
          icon={getStatusIcon(user)}
        />
        <List.Item.Detail.Metadata.Label title="Type" text={user.type} />

        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Created At" text={user.createdAt?.toDateString()} />
        <List.Item.Detail.Metadata.Label title="Updated At" text={user.updatedAt?.toDateString()} />
      </List.Item.Detail.Metadata>
    }
  />
)
