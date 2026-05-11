import { Action, ActionPanel, Detail, Icon } from "@raycast/api";

import { useResult } from "@/hooks/use-result";
import type { Result } from "@/types";

const contentBlobURL = "https://github.com/mdn/content/blob/main";
const translatedContentBlobURL = "https://github.com/mdn/translated-content/blob/main";

export const Details = (props: { result: Result; locale: string }) => {
  const { content, isEn, file, isLoading, revalidate } = useResult(props.result, props.locale);

  return (
    <Detail
      navigationTitle={`Search Web Docs - ${props.result.title}`}
      isLoading={isLoading}
      markdown={content}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={props.result.url} />
          <Action.OpenInBrowser
            title="Source on GitHub"
            url={`${isEn ? contentBlobURL : translatedContentBlobURL}${file}`}
          />
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
