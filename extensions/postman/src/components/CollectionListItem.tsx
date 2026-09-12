import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api"
import { useMemo } from "react"
import { RequestDetailsType } from "../types"
import { ResponseDetails } from "../components/ResponseDetails"
import { parseRequest } from "../utils"
import { CollectionItemDetails } from "./CollectionItemDetails"
import { RequestBuilder } from "./RequestBuilder"
import { CollectionList } from "./CollectionList"

type CollectionListItemProps = {
  requestDetails: RequestDetailsType
  isLoading: boolean
}

export const CollectionListItem: React.FC<CollectionListItemProps> = ({
  requestDetails,
  isLoading,
}) => {
  const { push } = useNavigation()

  if ("item" in requestDetails) {
    return (
      <List.Item
        key={requestDetails.id}
        title={requestDetails.name}
        icon={{ source: Icon.Folder, tintColor: Color.Orange }}
        detail={
          <List.Item.Detail
            metadata={
              <Detail.Metadata>
                <Detail.Metadata.Label
                  title="Folder Name"
                  text={requestDetails.name}
                />
                <Detail.Metadata.Separator />
              </Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action
              title="Open Folder"
              icon={Icon.List}
              onAction={() =>
                push(
                  <CollectionList
                    item={requestDetails["item"] as RequestDetailsType[]}
                  />
                )
              }
            />
          </ActionPanel>
        }
      />
    )
  }

  const urlInfo = useMemo(
    () => parseRequest(requestDetails.request),
    [requestDetails]
  )

  return (
    <List.Item
      title={requestDetails.request.method + "  " + requestDetails.name}
      key={requestDetails.id}
      icon={{
        source: Icon.Document,
        tintColor: Color.Orange,
      }}
      detail={
        <CollectionItemDetails isLoading={isLoading} data={requestDetails} />
      }
      actions={<Actions urlInfo={urlInfo} requestDetails={requestDetails} />}
    />
  )
}

const Actions: React.FC<{
  urlInfo: ReturnType<typeof parseRequest>
  requestDetails: RequestDetailsType
}> = ({ urlInfo, requestDetails }) => {
  if (requestDetails.request.method !== "GET") {
    return (
      <ActionPanel>
        <Action
          title="Send Request"
          icon={Icon.Upload}
          onAction={() =>
            showToast({
              title: requestDetails.request.method + " not supported",
              message:
                "This extension does not support requests with methods other than 'GET' yet.",
              style: Toast.Style.Failure,
            })
          }
        />
      </ActionPanel>
    )
  }
  if (urlInfo) {
    return (
      <ActionPanel>
        <Action.Push
          target={
            urlInfo.params || urlInfo.variables ? (
              <RequestBuilder
                url={urlInfo.url}
                params={urlInfo.params}
                variables={urlInfo.variables}
                header={requestDetails.request.header}
                method={requestDetails.request.method}
                name={requestDetails.name}
              />
            ) : (
              <ResponseDetails
                url={urlInfo.url}
                header={requestDetails.request.header}
                method={requestDetails.request.method}
              />
            )
          }
          title="Send Request"
          icon={Icon.Upload}
        />
      </ActionPanel>
    )
  }
  return (
    <ActionPanel>
      <Action
        title="Send Request"
        icon={Icon.Upload}
        onAction={() =>
          showToast({
            title: "No URL for this response.",
            style: Toast.Style.Failure,
          })
        }
      />
    </ActionPanel>
  )
}
