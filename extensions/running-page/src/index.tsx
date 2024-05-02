import { Action, ActionPanel, getPreferenceValues, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { github } from "./util/auth";
import Stat from "./components/Stat";
import { useRunningPage } from "./hook/useRunningPage";
import { getOwnerAndRepository } from "./util/utils";

function AuthorizedComponent() {
  const preferences = getPreferenceValues<Preferences>();
  const repository = getOwnerAndRepository(preferences.repository);
  const { data, isLoading, revalidate } = useRunningPage({ ...repository, path: preferences.path });

  return (
    <List
      isShowingDetail={true}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action onAction={revalidate} title="Refresh" icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    >
      {data ? data.map((item) => <Stat activity={item} key={item.run_id} />) : <List.EmptyView title="No data now" />}
    </List>
  );
}

export default withAccessToken(github)(AuthorizedComponent);
