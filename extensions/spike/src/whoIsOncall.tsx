import { List, Icon, showToast, Toast, ActionPanel, Action } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import api from "./api";
import OncallViewPage from "./components/OncallViewPage";
import AddOverride from "./addOverride";
import shortcut from "./config/shortcut";
import config from "./config";

interface Profile {
  baseUrl: string;
  avatar: string;
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  profile: Profile;
}

interface OncallInfo {
  _id: string;
  name: string;
}

interface Shift {
  _id: string;
  name: string;
  user: User;
  oncall: OncallInfo;
}

function ShiftListItem({ shift }: { shift: Shift }) {
  const avatarSource = shift.user.profile?.avatar
    ? `${shift.user.profile.baseUrl}${shift.user.profile.avatar}`
    : Icon.Person;

  return (
    <List.Item
      icon={{ source: avatarSource }}
      title={`${shift.user.firstName} ${shift.user.lastName}`}
      subtitle={shift.user.email}
      accessories={[{ text: shift.oncall.name || "Unknown" }]}
      keywords={[
        `${shift.user.firstName} ${shift.user.lastName}`,
        shift.user.email,
        shift.oncall.name
      ]}
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Details"
            icon={Icon.Info}
            target={<OncallViewPage oncallId={shift.oncall._id} />}
          />
          <Action.Open
            icon={Icon.Globe}
            title="Open in Spike"
            target={`${config!.spike}/on-calls/${shift.oncall._id}`}
          />
          <Action.Push
            shortcut={shortcut.ADD_OVERRIDE}
            title="Add Override"
            icon={Icon.Person}
            target={<AddOverride oncallId={shift.oncall._id} />}
          />
        </ActionPanel>
      }
    />
  );
}

export default function WhoIsOncall() {
  const { 
    data: activeShifts, 
    isLoading, 
    error,
  } = useCachedPromise(
    async () => {
      try {
        const response = await api.oncall.getActiveSchedules();
        return response as Shift[];
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
      }
    }
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

  return (
    <List
      navigationTitle="Current On-Call Members"
      searchBarPlaceholder="Search by on-call name"
      isLoading={isLoading}
    >
      <List.Section 
        title="Current On-Call Members"
        subtitle={activeShifts && activeShifts.length > 0 ? `${activeShifts.length} members` : undefined}
      >
        {activeShifts && activeShifts.map((shift: Shift) => (
          <ShiftListItem key={shift._id} shift={shift} />
        ))}
      </List.Section>
    </List>
  );
}