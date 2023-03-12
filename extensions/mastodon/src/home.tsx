import { Action, ActionPanel, Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMasto } from "./hooks/masto";
import StatusItem from "./components/StatusItem";
import { mastodon } from "masto";

export default function Home() {
  const masto = useMasto();
  const { data, revalidate } = usePromise(
    async (masto?: mastodon.Client) => {
      if (!masto) return;
      return await masto?.v1.timelines.listHome();
    },
    [masto]
  );

  return (
    <List
      isLoading={!!data}
      isShowingDetail
      actions={
        <ActionPanel>
          <Action
            title="Reload"
            icon={Icon.RotateClockwise}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    >
      {data?.map((status) => (
        <StatusItem compact key={status.id} status={status} revalidate={revalidate} />
      ))}
    </List>
  );
}
