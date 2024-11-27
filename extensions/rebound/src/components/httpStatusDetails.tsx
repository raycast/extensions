import { Detail, List } from "@raycast/api";
import { ReboundResponseStatus } from "../types/rebound";
import { getStatusColor } from "../utils/response";

export type HttpStatusDetailsProps = {
  status: ReboundResponseStatus;
};

function BaseHttpStatusDetails(
  props: Readonly<
    HttpStatusDetailsProps & {
      Metadata: typeof List.Item.Detail.Metadata | typeof Detail.Metadata;
    }
  >,
) {
  const { status, Metadata } = props;

  const color = getStatusColor(status.code);

  return (
    <Metadata.TagList title="Status">
      <Metadata.TagList.Item text={status.code.toString()} color={color} />
      <Metadata.TagList.Item text={status.message} color={color} />
    </Metadata.TagList>
  );
}

export function HttpStatusListItemDetails(props: HttpStatusDetailsProps) {
  return <BaseHttpStatusDetails {...props} Metadata={List.Item.Detail.Metadata} />;
}
HttpStatusListItemDetails.$$wrapped = BaseHttpStatusDetails;

export function HttpStatusDetails(props: HttpStatusDetailsProps) {
  return <BaseHttpStatusDetails {...props} Metadata={Detail.Metadata} />;
}
HttpStatusDetails.$$wrapped = BaseHttpStatusDetails;
