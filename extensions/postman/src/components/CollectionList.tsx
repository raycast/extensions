import { Icon, List, showToast, Toast } from "@raycast/api"
import { useEffect, useState } from "react"
import { useFetch } from "../fetch/useFetch"
import { CollectionDetailType } from "../types"
import { CollectionListItem } from "./CollectionListItem"

export const CollectionList = (props: { id: string }) => {
  const [requests, setRequests] =
    useState<CollectionDetailType["collection"]["item"]>()

  const { data, isLoading, error } = useFetch("getCollection", props.id)

  useEffect(() => {
    data && setRequests((data as CollectionDetailType).collection.item)
  }, [data])

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
    >
      {requests && requests.length > 0 ? (
        requests.map((requestDetails) => (
          <CollectionListItem
            requestDetails={requestDetails}
            isLoading={isLoading}
            key={requestDetails.id}
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.QuestionMark}
          description="No Requests Found"
        />
      )}
    </List>
  )
}
