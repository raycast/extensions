import { Detail, useNavigation } from "@raycast/api";
import { useEffect } from "react";
import { registerDetail } from "../lib/detail-stack";

export const GenericDetail = <T,>({
  actions,
  isLoading,
  item,
  markdown,
  metadata,
  navigationTitle,
}: {
  actions: (item: T) => Detail.Props["actions"];
  isLoading: Detail.Props["isLoading"];
  item: T;
  markdown: (item: T) => string;
  metadata: (item: T) => Detail.Props["metadata"];
  navigationTitle: (item: T) => string;
}) => {
  const { pop } = useNavigation();
  useEffect(() => registerDetail(pop), [pop]);

  const markdownContent = markdown(item);
  const metadataContent = metadata(item);
  const titleContent = navigationTitle(item);
  const actionsContent = actions(item);

  return (
    <Detail
      markdown={markdownContent}
      navigationTitle={titleContent}
      isLoading={isLoading}
      metadata={metadataContent}
      actions={actionsContent}
    />
  );
};
