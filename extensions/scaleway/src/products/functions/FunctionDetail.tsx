import { Color, Icon, List } from '@raycast/api'
import type { Function } from '@scaleway/sdk'
import { getFunctionStatusIcon } from './status'

type FunctionDetailProps = {
  serverlessFunction: Function.v1beta1.Function
  namespaces?: Function.v1beta1.Namespace[]
}

export const getPrivacyAccessory = (privacy: Function.v1beta1.FunctionPrivacy) => {
  switch (privacy) {
    case 'public':
      return { icon: { source: Icon.LockUnlocked, tintColor: Color.Green }, tooltip: 'Public' }
    case 'private':
      return { icon: Icon.Lock, tooltip: 'Private' }
    case 'unknown_privacy':
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
    default:
      return { icon: Icon.QuestionMarkCircle, tooltip: 'Unknown' }
  }
}

export const FunctionDetail = ({ serverlessFunction, namespaces }: FunctionDetailProps) => {
  const namespace = (namespaces || []).find(({ id }) => id === serverlessFunction.namespaceId)

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={serverlessFunction.status}
            icon={getFunctionStatusIcon(serverlessFunction)}
          />

          {serverlessFunction.errorMessage && (
            <List.Item.Detail.Metadata.Label
              title="Error"
              text={serverlessFunction.errorMessage}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
            />
          )}

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label title="ID" text={serverlessFunction.id} />
          <List.Item.Detail.Metadata.Label title="Name" text={serverlessFunction.name} />

          <List.Item.Detail.Metadata.Label
            title="Privacy"
            text={getPrivacyAccessory(serverlessFunction.privacy).tooltip}
            icon={getPrivacyAccessory(serverlessFunction.privacy).icon}
          />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Label
            title="Resources"
            icon={Icon.ComputerChip}
            text={`${serverlessFunction.memoryLimit} Mo - ${serverlessFunction.cpuLimit} mCPU`}
          />
          <List.Item.Detail.Metadata.Label
            title="Scale"
            text={`${serverlessFunction.minScale} min - ${serverlessFunction.maxScale} max`}
          />

          <List.Item.Detail.Metadata.Label title="Timeout" text={serverlessFunction.timeout} />

          <List.Item.Detail.Metadata.Separator />

          <List.Item.Detail.Metadata.Link
            title="Domain"
            text={serverlessFunction.domainName}
            target={`https://${serverlessFunction.domainName}`}
          />

          <List.Item.Detail.Metadata.Separator />

          {namespace ? (
            <>
              <List.Item.Detail.Metadata.Label title="Project ID" text={namespace.projectId} />
              <List.Item.Detail.Metadata.Label
                title="Organization ID"
                text={namespace.organizationId}
              />
            </>
          ) : null}
        </List.Item.Detail.Metadata>
      }
    />
  )
}
