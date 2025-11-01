import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import { useDetails } from "@/hooks/use-result";
import { getCompGithubUrl, getCompDocUrl } from "@/utils";

import type { DocItem } from "@/type";

interface Props {
  language: string;
  docItem: DocItem;
}

export const DocumentationDetails = (props: Props) => {
  const { isLoading, content, revalidate } = useDetails(props.language, props.docItem);

  return (
    <Detail
      navigationTitle={`Search Vant Documentation - ${props.docItem.title}`}
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={getCompDocUrl(props.language, props.docItem)} />,
          <Action.OpenInBrowser title="Source on GitHub" url={getCompGithubUrl(props.language, props.docItem)} />
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
