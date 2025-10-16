import { Detail } from "@raycast/api";

import { statusIdToColor } from "../utils";
import { usePageStatus } from "../hooks/usePageStatus";

interface StyleguideStatusTagDetailMetadataLabelProps {
  pageId: number;
}

export function StyleguideStatusTagDetailMetadataLabel({ pageId }: StyleguideStatusTagDetailMetadataLabelProps) {
  const { data, isLoading } = usePageStatus(pageId);

  if (isLoading || !data || !data.id) {
    return null;
  }

  return (
    <Detail.Metadata.TagList title="Status">
      <Detail.Metadata.TagList.Item text={data.name} color={statusIdToColor(data.id)} />
    </Detail.Metadata.TagList>
  );
}
