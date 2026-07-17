import { List, Icon, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import api from "./api";
import OncallViewPage from "./components/OncallViewPage";
import AddOverride from "./addOverride";
import shortcut from "./config/shortcut";
import config from "./config";

interface Profile {
  baseUrl?: string;
  avatar?: string;
}

interface User {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profile?: Profile;
}

interface OncallInfo {
  _id: string;
  name?: string;
}

interface Shift {
  _id: string;
  name?: string;
  user?: User;
  oncall?: OncallInfo;
}

function getFullName(user?: User): string {
  if (!user) return "Unknown User";
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Unknown User";
}

function getAvatarSource(profile?: Profile): string | Icon {
  if (!profile?.baseUrl || !profile.avatar) return Icon.Person;
  return `${profile.baseUrl}${profile.avatar}`;
}

function ShiftListItem({ shift }: { shift: Shift }) {
  if (!shift.user || !shift.oncall) return null;

  const avatarSource = getAvatarSource(shift.user.profile);
  const fullName = getFullName(shift.user);

  return (
    <List.Item
      icon={{ source: avatarSource }}
      title={fullName}
      subtitle={shift.user.email || "No email"}
      accessories={[{ text: shift?.oncall?.name || "Unknown" }]}
      keywords={[fullName, shift.user.email, shift?.oncall?.name].filter((keyword): keyword is string =>
        Boolean(keyword),
      )}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Info} target={<OncallViewPage oncallId={shift.oncall._id} />} />
          {config?.spike && (
            <Action.Open
              icon={Icon.Globe}
              title="Open in Spike"
              target={`${config.spike}/on-calls/${shift?.oncall?._id}`}
            />
          )}
          <Action.Push
            shortcut={shortcut.ADD_OVERRIDE}
            title="Add Override"
            icon={Icon.Person}
            target={<AddOverride oncallId={shift?.oncall?._id} />}
          />
        </ActionPanel>
      }
    />
  );
}

export default function WhoIsOncall() {
  const {
    data: activeShifts = [],
    isLoading,
    error,
  } = useCachedPromise(
    async () => {
      try {
        const response = await api.oncall.getActiveSchedules();
        return (response || []) as Shift[];
      } catch (err) {
        const error = err instanceof Error ? err : new Error("An unknown error occurred");
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch on-call schedules",
          message: error.message,
        });
        throw error;
      }
    },
    [],
    {
      initialData: [] as Shift[],
      keepPreviousData: true,
      onError: (error) => {
        console.error("Error fetching active schedules:", error);
      },
    },
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XmarkCircle}
          title="Error"
          description={error instanceof Error ? error.message : "Failed to load on-call schedules"}
        />
      </List>
    );
  }
  const validShifts = activeShifts.filter((shift) => shift?.user && shift?.oncall);

  return (
    <List navigationTitle="Current On-Call Members" searchBarPlaceholder="Search by on-call name" isLoading={isLoading}>
      <List.Section
        title="Current On-Call Members"
        subtitle={validShifts.length > 0 ? `${validShifts.length} members` : undefined}
      >
        {validShifts.map((shift: Shift) => (
          <ShiftListItem key={shift._id} shift={shift} />
        ))}
      </List.Section>
    </List>
  );
}
