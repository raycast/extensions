import { Detail, Icon, List } from "@raycast/api";
import { Rebound } from "../types/rebound";

export type RequestDetailsProps = {
  rebound: Rebound;
};

const REQUEST_DETAILS_TITLE = "Request";

function BaseRequestDetails(
  props: Readonly<
    RequestDetailsProps & {
      Metadata: typeof List.Item.Detail.Metadata | typeof Detail.Metadata;
    }
  >,
) {
  const { rebound, Metadata } = props;

  return (
    <>
      <Metadata.TagList title={REQUEST_DETAILS_TITLE}>
        <Metadata.TagList.Item icon={Icon.Hashtag} text={rebound.details.method} />
        <Metadata.TagList.Item icon={Icon.Globe} text={rebound.url.toString()} />
      </Metadata.TagList>
      {rebound.details.query && Object.keys(rebound.details.query).length > 0 ? (
        <Metadata.TagList title="Query Parameters">
          {Object.entries(rebound.details.query).map(([key, value]) => (
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
