import { Detail, List } from "@raycast/api";
import React from "react";
import { Request } from "../types/request";

export type HeadersDetailsProps = {
  headers: Request["responses"][number]["headers"];
};

function BaseHeadersDetails(
  props: Readonly<
    HeadersDetailsProps & {
      Metadata: typeof List.Item.Detail.Metadata | typeof Detail.Metadata;
    }
  >,
) {
  const { headers, Metadata } = props;

  if (Object.keys(headers).length === 0) {
    return null;
  }

  return Object.entries(headers).map(([key, value]) => <Metadata.Label key={key} title={key} text={value} />);
}

export function HeadersListItemDetails(props: Readonly<HeadersDetailsProps>) {
  return <BaseHeadersDetails {...props} Metadata={List.Item.Detail.Metadata} />;
}
HeadersListItemDetails.$$wrapped = BaseHeadersDetails;

export function HeadersDetails(props: Readonly<HeadersDetailsProps>) {
  return <BaseHeadersDetails {...props} Metadata={Detail.Metadata} />;
}
HeadersDetails.$$wrapped = BaseHeadersDetails;
