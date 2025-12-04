import { Action, Cache, ActionPanel, Icon, List, useNavigation, confirmAlert, Alert } from "@raycast/api";
import { trpc } from "@/utils/trpc.util";
import { CachedQueryClientProvider } from "@/components/CachedQueryClientProvider";
import { sessionTokenAtom } from "@/states/session-token.state";
import { useAtom } from "jotai";
import { EditProfileNameForm } from "./EditProfileNameForm";
import { useSortedSpaces } from "../hooks/use-sorted-spaces.hook";

const cache = new Cache();

const Body = () => {
  const { data, isLoading, refetch } = trpc.user.me.useQuery();
  const { pop } = useNavigation();
  const [, setSessionToken] = useAtom(sessionTokenAtom);
  const utils = trpc.useUtils();
  const spaces = useSortedSpaces(data?.associatedSpaces);

  return (
    <List isLoading={isLoading}>
      <List.Section title="User Information">
        <List.Item icon={Icon.Envelope} title="Email" subtitle={data?.email} />
        <List.Item
          icon={Icon.Person}
          title="Name"
          subtitle={data?.name}
          actions={
            <ActionPanel>
              {data?.name && (
                <Action.Push
                  title="Edit"
                  icon={Icon.Pencil}
                  target={<EditProfileNameForm name={data.name} />}
                  onPop={refetch}
                />
              )}
            </ActionPanel>
          }
        />
        <List.Item
          title="Sign out"
          icon={Icon.Logout}
          keywords={["sign out", "log out"]}
          actions={
            <ActionPanel>
              <Action
                title="Sign Out"
                icon={Icon.Logout}
                onAction={async () => {
                  const confirm = await confirmAlert({
                    title: "Sign Out",
                    message: "Are you sure you want to sign out?",
                    primaryAction: {
                      title: "Sign Out",
                      style: Alert.ActionStyle.Destructive,
                    },
                  });
                  if (!confirm) return;

                  utils.user.me.reset();
                  utils.user.me.invalidate();
                  cache.clear();
                  setSessionToken("");
                  pop();
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title="Joined Spaces">
        {spaces?.map((space) => (
          <List.Item
            key={space.id}
            title={space.name}
            subtitle={space.description || undefined}
            icon={space.image ?? (space.type === "TEAM" ? Icon.TwoPeople : Icon.Person)}
          />
        ))}
      </List.Section>
    </List>
  );
};

export default function MyAccount() {
  return (
    <CachedQueryClientProvider>
      <Body />
    </CachedQueryClientProvider>
  );
}
