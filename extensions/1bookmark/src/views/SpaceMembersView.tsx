import { trpc } from "@/utils/trpc.util";
import { Icon, List } from "@raycast/api";
import { CachedQueryClientProvider } from "../components/CachedQueryClientProvider";
import { SpaceMemberItemActionPanel } from "../components/SpaceMemberItemActionPanel";
import { useMemo } from "react";
import { useMe } from "../hooks/use-me.hook";

export const Body = (props: { spaceId: string }) => {
  const me = useMe();
  const { spaceId } = props;
  const { data, refetch, isFetching } = trpc.user.listBySpaceId.useQuery(spaceId);

  const myRole = useMemo(() => {
    if (!me.data) return null;
    if (!data) return null;

    return data.find((m) => m.email === me.data.email)?.role;
  }, [me.data, data]);

  return (
    <List isLoading={isFetching || !data}>
      {data?.map((m) => (
        <List.Item
          key={m.email}
          title={m.user.name}
          subtitle={`${m.email} / ${m.role.toLowerCase()}`}
          accessories={[{ text: m.status }]}
          icon={m.user.image || Icon.Person}
          actions={
            myRole &&
            me.data && (
              <SpaceMemberItemActionPanel me={me.data} spaceId={spaceId} member={m} myRole={myRole} refetch={refetch} />
            )
          }
        />
      ))}
    </List>
  );
};

export function SpaceMembersView(props: { spaceId: string }) {
  const { spaceId } = props;
  return (
    <CachedQueryClientProvider>
      <Body spaceId={spaceId} />
    </CachedQueryClientProvider>
  );
}
