import { List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMasto } from "./hooks/masto";
import StatusItem from "./components/StatusItem";
import { mastodon } from "masto";

export default function Mentions() {
  const masto = useMasto();
  const { data, isLoading } = usePromise(
    async (masto?: mastodon.Client) => {
      if (!masto) return;
      return await masto?.v1.notifications.list({ types: ["mention"] });
    },
    [masto]
  );

  return (
    <List isLoading={!masto || isLoading} isShowingDetail>
      {data?.map(({ status, id }) => status && <StatusItem key={id} status={status} />)}
    </List>
  );
}
