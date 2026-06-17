import { Action, ActionPanel, Detail, showToast, Toast } from "@raycast/api";
import { loadFront } from "yaml-front-matter";

import { TopicType } from "./types/GithubType";
import { getPageFromCache, checkForUpdates } from "./services/NextjsPage";
import { usePromise } from "@raycast/utils";

const TopicDetail = (props: { topic: TopicType; url: string }) => {
  const { isLoading, data: markdown } = usePromise(
    async () => {
      const cached_data = await getPageFromCache(props.topic);
      const updated_data = await checkForUpdates(props.topic);
      const parsed = loadFront(updated_data || cached_data || "");
      return parsed.__content;
    },
    [],
    {
      async onData() {
        await showToast(Toast.Style.Success, `Fetched item`);
      },
    },
  );

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={props.topic.title}
      markdown={markdown || ""}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser icon="command-icon.png" url={props.url} />
        </ActionPanel>
      }
    />
  );
};

export default TopicDetail;
