import { Detail, List } from "@raycast/api"
import { RequestDetailsType } from "../types"
import React from "react"

import { getURL } from "../utils"

export const CollectionItemDetails = (props: {
  data: RequestDetailsType
  isLoading: boolean
}) => {
  const { name, request } = props.data
  const url = getURL(request)
  const urlDisplay =
    url?.raw ||
    (url?.protocol && url?.host
      ? `${url.protocol}://${url.host.join(".")}${
          url.path && url.path.length > 0 ? "/" + url.path.join("/") : ""
        }`
      : "N/A")

  return (
    <List.Item.Detail
      isLoading={props.isLoading}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Request Name" text={name} />
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label
            title="Method"
            text={request.method || "GET"}
          />
          <Detail.Metadata.Label title="URL" text={urlDisplay} />
        </Detail.Metadata>
      }
    />
  )
}
