import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMasto } from "./hooks/masto";
import StatusItem from "./components/StatusItem";
import { mastodon } from "masto";

export default function Home() {
  const masto = useMasto();
  const { data, isLoading, revalidate } = usePromise(
    async (masto?: mastodon.Client) => {
      if (!masto) return;
      return await masto?.v1.timelines.listHome();
    },
    [masto]
  );

  return (
    <List isLoading={!masto || isLoading} isShowingDetail>
      {data?.map((status) => (
        <StatusItem key={status.id} status={status} revalidate={revalidate} />
      ))}
    </List>
  );
}
