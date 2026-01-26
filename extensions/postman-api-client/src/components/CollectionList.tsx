import { Action, ActionPanel, Icon, List, showToast, Toast, useNavigation } from "@raycast/api"
import { useEffect, useState } from "react"
import React from "react"
import { useFetch } from "../fetch/useFetch"
import { CollectionDetailType } from "../types"
import { CollectionListItem } from "./CollectionListItem"
import { CreateRequest } from "./CreateRequest"

export const CollectionList = (props: {
  id?: string
  item?: CollectionDetailType["collection"]["item"]
  collectionName?: string
}) => {
  const { push } = useNavigation()
  const [requests, setRequests] = useState<CollectionDetailType["collection"]["item"]>()

  const { data, isLoading, error } = props.item
    ? { data: props.item, isLoading: false, error: undefined }
    : useFetch("getCollection", props.id)

  useEffect(() => {
    if (data) {
      if (props.item) {
        setRequests(data as CollectionDetailType["collection"]["item"])
      } else {
        setRequests((data as CollectionDetailType).collection.item)
      }
    }
  }, [data, props.item])

  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Failed loading collection.",
      message: error.message,
    })
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={requests && requests.length > 0}
      searchBarPlaceholder="Search requests"
      navigationTitle="List Requests"
      actions={
        props.id ? (
          <ActionPanel>
            <Action
              title="Create New Request"
              icon={Icon.Plus}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
              onAction={() => {
                if (props.id) {
                  push(<CreateRequest collectionId={props.id} collectionName={props.collectionName} />)
                }
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    >
      {requests && requests.length > 0 ? (
        requests.map((requestDetails) => (
          <CollectionListItem
            requestDetails={requestDetails}
            isLoading={isLoading}
            collectionId={props.id}
            key={requestDetails.id}
          />
        ))
      ) : (
        <List.EmptyView icon={Icon.QuestionMark} description="No Requests Found" />
      )}
    </List>
  )
}
