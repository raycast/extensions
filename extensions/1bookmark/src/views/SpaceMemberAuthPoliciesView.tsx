import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { trpc } from "../utils/trpc.util";
import { NewSpaceMemberAuthPolicyForm } from "./NewSpaceMemberAuthPolicyForm";
import { SpaceMemberAuthPolicyItemActionPanel } from "../components/SpaceMemberAuthPolicyItemActionPanel";
import { useMe } from "../hooks/use-me.hook";

export const Body = (props: { spaceId: string }) => {
  const { spaceId } = props;
  const { data: space, refetch, isLoading, isFetching } = trpc.space.get.useQuery({ spaceId });
  const { data: me } = useMe();

  if (isLoading || !space) {
    return <List isLoading />;
  }

  if (space.memberAuthPolicies.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="Create a new member email auth policy"
          description="You can create authentication policies, such as allowing only certain email domains."
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title="Create New Member Email Auth Policy"
                icon={Icon.Plus}
                shortcut={Keyboard.Shortcut.Common.New}
                target={<NewSpaceMemberAuthPolicyForm spaceId={spaceId} />}
                onPop={() => refetch()}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List isLoading={isFetching}>
      {space.memberAuthPolicies.map((item) => {
        const days = Math.floor(item.authCheckIntervalSec / 86400);
        const authCheckInterval =
          item.authCheckIntervalSec > 0 ? `Every ${days} ${days === 1 ? "day" : "days"}` : undefined;
        return (
          <List.Item
            key={item.emailPattern}
            title={item.emailPattern}
            icon={Icon.Lock}
            accessories={[{ text: authCheckInterval }]}
            actions={
              <SpaceMemberAuthPolicyItemActionPanel
                refetch={refetch}
                spaceId={spaceId}
                emailPattern={item.emailPattern}
                me={me}
              />
            }
          />
        );
      })}
    </List>
  );
};

export function SpaceMemberAuthPoliciesView(props: { spaceId: string }) {
  const { spaceId } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  );
}
