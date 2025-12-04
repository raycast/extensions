import { Detail, List } from "@raycast/api"
import { RequestDetailsType } from "../types"

export const CollectionItemDetails = (props: {
  data: RequestDetailsType
  isLoading: boolean
}) => {
  const { name, request } = props.data
  return (
    <List.Item.Detail
      isLoading={props.isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Request Name" text={name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Method" text={request.method} />
          <Detail.Metadata.Label title="URL" text={request.url?.raw} />
        </Detail.Metadata>
      }
    />
  )
}
