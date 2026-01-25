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
import React from "react"
import { RequestDetailsType } from "../types"
import { ResponseDetails } from "./ResponseDetails"
import { parseRequest } from "../utils"
import { CollectionItemDetails } from "./CollectionItemDetails"
import { RequestBuilder } from "./RequestBuilder"
import { CollectionList } from "./CollectionList"
import { RequestDetailView } from "./RequestDetailView"

type CollectionListItemProps = {
  requestDetails: RequestDetailsType
  isLoading: boolean
  collectionId?: string
}

export const CollectionListItem: React.FC<CollectionListItemProps> = ({
  requestDetails,
  isLoading,
  collectionId,
}) => {
  const { push } = useNavigation()

  if ("item" in requestDetails && requestDetails.item) {
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
                    id={collectionId}
                    item={requestDetails.item as RequestDetailsType[]}
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
      title={
        (requestDetails.request.method || "GET") + "  " + requestDetails.name
      }
      key={requestDetails.id}
      icon={{
        source: Icon.Document,
        tintColor: Color.Orange,
      }}
      detail={
        <CollectionItemDetails isLoading={isLoading} data={requestDetails} />
      }
      actions={
        <Actions
          urlInfo={urlInfo}
          requestDetails={requestDetails}
          collectionId={collectionId}
          onViewDetails={() => {
            push(
              <RequestDetailView
                requestDetails={requestDetails}
                collectionId={collectionId}
              />
            )
          }}
        />
      }
    />
  )
}

const Actions: React.FC<{
  urlInfo: ReturnType<typeof parseRequest>
  requestDetails: RequestDetailsType
  collectionId?: string
  onViewDetails: () => void
}> = ({ urlInfo, requestDetails, collectionId, onViewDetails }) => {
  if (!urlInfo) {
    return (
      <ActionPanel>
        <Action
          title="Send Request"
          icon={Icon.Upload}
          onAction={() =>
            showToast({
              title: "No URL for this request.",
              style: Toast.Style.Failure,
            })
          }
        />
      </ActionPanel>
    )
  }

  const method = requestDetails.request.method || "GET"
  const hasBody = ["POST", "PUT", "PATCH"].includes(method)
  const needsForm = urlInfo.params || urlInfo.variables || hasBody
  const canQuickExecute = !needsForm && method === "GET"

  return (
    <ActionPanel>
      <Action
        title="View Details"
        icon={Icon.Eye}
        shortcut={{ modifiers: ["cmd"], key: "enter" }}
        onAction={onViewDetails}
      />
      {canQuickExecute && (
        <Action.Push
          target={
            <ResponseDetails
              url={urlInfo.url}
              header={requestDetails.request.header}
              method={method}
              name={requestDetails.name}
            />
          }
          title="Quick Execute"
          icon={Icon.Bolt}
          shortcut={{ modifiers: ["cmd", "shift"], key: "enter" }}
        />
      )}
      <Action.Push
        target={
          needsForm ? (
            <RequestBuilder
              url={urlInfo.url}
              params={urlInfo.params}
              variables={urlInfo.variables}
              header={requestDetails.request.header}
              method={method}
              name={requestDetails.name}
              body={requestDetails.request.body}
              collectionId={collectionId}
              requestId={requestDetails.id}
              originalRequest={requestDetails.request}
            />
          ) : (
            <ResponseDetails
              url={urlInfo.url}
              header={requestDetails.request.header}
              method={method}
              name={requestDetails.name}
            />
          )
        }
        title="Send Request"
        icon={Icon.Upload}
      />
    </ActionPanel>
  )
}
