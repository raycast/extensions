import { Detail, Icon, List } from "@raycast/api";
import { Request } from "../types/request";

export type RequestDetailsProps = {
  request: Request;
};

const REQUEST_DETAILS_TITLE = "Request";

function BaseRequestDetails(
  props: Readonly<
    RequestDetailsProps & {
      Metadata: typeof List.Item.Detail.Metadata | typeof Detail.Metadata;
    }
  >,
) {
  const { request, Metadata } = props;

  return (
    <>
      <Metadata.TagList title={REQUEST_DETAILS_TITLE}>
        <Metadata.TagList.Item icon={Icon.Hashtag} text={request.details.method} />
        <Metadata.TagList.Item icon={Icon.Globe} text={request.url.toString()} />
      </Metadata.TagList>
      {request.details.query && Object.keys(request.details.query).length > 0 ? (
        <Metadata.TagList title="Query Parameters">
          {Object.entries(request.details.query).map(([key, value]) => (
            <Metadata.TagList.Item key={key} icon={Icon.Tag} text={`${key}=${value}`} />
          ))}
        </Metadata.TagList>
      ) : null}
    </>
  );
}

export function RequestListItemDetails(props: Readonly<RequestDetailsProps>) {
  return <BaseRequestDetails {...props} Metadata={List.Item.Detail.Metadata} />;
}
RequestListItemDetails.$$wrapped = BaseRequestDetails;

export function RequestDetails(props: Readonly<RequestDetailsProps>) {
  return <BaseRequestDetails {...props} Metadata={Detail.Metadata} />;
}
RequestDetails.$$wrapped = BaseRequestDetails;
