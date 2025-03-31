import { List, Icon, showToast, Toast, ActionPanel, Action, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import api from "./api";
import OncallViewPage from "./components/OncallViewPage";
import AddOverride from "./addOverride";
import moment from "moment-timezone";
import shortcut from "./config/shortcut";
import config from "./config";

interface Oncall {
  _id: string;
  name?: string;
  idOfOnCallPerson: string;
  usernameOfOnCallPerson: string;
  shifts: Shift[];
}

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface Shift {
  idOfOnCallPerson: string | undefined;
  _id: string;
  oncall: Oncall;
  start: string;
  end: string;
  active: boolean;
}

interface ActiveOncall {
  isCurrentlyOncall: boolean;
  oncallData: Oncall;
}

interface ApiResponse {
  user: User;
  oncalls: Oncall[];
  activeOncall: ActiveOncall;
}

const RenderShiftItem = ({ item: oncall, user, isMine }: { item: Oncall; user: User; isMine: boolean }) => {
  const activeShift = oncall.shifts.find((shift) => shift.active);

  return (
    <List.Item
      keywords={[oncall.name || "", oncall.idOfOnCallPerson || ""]}
      title={oncall.name || "Unknown"}
      subtitle={isMine && activeShift ? `Ends at ${moment(activeShift.end).format("h:mm A, Do MMMM")}` : ""}
      accessories={[
        activeShift && user && user._id === oncall.idOfOnCallPerson
          ? {
              tag: {
                value: "You are on-call",
                color: Color.Green,
              },
            }
          : { text: `${oncall.usernameOfOnCallPerson ? oncall.usernameOfOnCallPerson + " is on-call" : ""}` },
      ]}
      actions={
        <ActionPanel>
          <Action.Push title="Show Details" icon={Icon.Info} target={<OncallViewPage oncallId={oncall._id} />} />
          <Action.Open icon={Icon.Globe} title="Open in Spike" target={`${config!.spike}/on-calls/${oncall._id}`} />
          <Action.Push
            title="Add Override"
            shortcut={shortcut.ADD_OVERRIDE}
            icon={Icon.Person}
            target={<AddOverride oncallId={oncall._id} />}
          />
        </ActionPanel>
      }
    />
  );
};

export default function MyOncalls() {
  const { data, isLoading, error } = useCachedPromise<() => Promise<ApiResponse>>(
    async () => {
      try {
        const [oncallsResponse, userResponse, activeOncallResponse] = await Promise.all([
          api.oncall.getMyOncalls(),
          api.users.getUser(),
          api.oncall.amIOncall(),
        ]);

        return {
          oncalls: oncallsResponse.oncalls,
          user: userResponse,
          activeOncall: activeOncallResponse,
        };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch on-call schedules",
          message: errorMessage,
        });
        throw err;
      }
    },
    [],
    {
      onError: (err) => {
        console.error("Error fetching oncall data:", err);
      },
    },
  );

  if (error) {
    return (
      <List.EmptyView
        icon={Icon.XMarkCircle}
        title="Error"
        description={error instanceof Error ? error.message : "Failed to load oncall data"}
      />
    );
  }

  const user = data?.user;
  const myOncalls = data?.oncalls || [];
  const activeOncall = data?.activeOncall;

  return (
    <List
      navigationTitle={activeOncall?.isCurrentlyOncall ? "You are oncall" : "You are not oncall"}
      searchBarPlaceholder="Search user..."
      isLoading={isLoading}
    >
      <List.Section title="My Oncalls">
        {user &&
          myOncalls
            .filter((oncall) => oncall.idOfOnCallPerson === user._id)
            .map((oncall, index) => (
              <RenderShiftItem key={`${oncall._id}-${index}`} isMine={true} item={oncall} user={user} />
            ))}
        {user &&
          myOncalls
            .filter((oncall) => oncall.idOfOnCallPerson !== user._id)
            .map((oncall, index) => (
              <RenderShiftItem key={`${oncall._id}-${index}`} isMine={false} item={oncall} user={user} />
            ))}
      </List.Section>
    </List>
  );
}
