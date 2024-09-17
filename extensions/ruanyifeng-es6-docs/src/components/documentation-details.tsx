import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useDetails } from "@/hooks/use-result";
import { getDocUrl } from "@/utils";

import type { Doc } from "@/type";

interface Props {
  doc: Doc;
}

export const DocumentationDetails = (props: Props) => {
  const { isLoading, content, revalidate } = useDetails(props.doc);

  return (
    <Detail
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={getDocUrl(props.doc)} />,
          <Action
            icon={Icon.ArrowClockwise}
            title="Reload"
            onAction={() => revalidate()}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    />
  );
};
