import { useEffect, useState, useCallback } from "react";
import { List, Icon, showToast, Toast, ActionPanel, Action, Color } from "@raycast/api";
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

interface ApiError {
  message: string;
}

const MyOncalls = () => {
  const [myOncalls, setMyOncalls] = useState<Oncall[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeOncall, setActiveOncall] = useState<ActiveOncall | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  const fetchActiveSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.oncall.getMyOncalls();
      const user = await api.users.getUser();
      const oncall = await api.oncall.amIOncall();
      setActiveOncall(oncall.oncallData);
      setUser(user);
      setMyOncalls(data.oncalls);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch on-call schedules",
        message: apiError.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSchedules();
  }, [fetchActiveSchedules]);

  const RenderShiftItem = useCallback(
    ({ item: shift, user, isMine }: { item: Oncall; user: User; isMine: boolean }) => {
      const oncall = shift;
      const activeShift = oncall.shifts.find((shift) => shift.active);
      return (
        <List.Item
          keywords={[oncall.name || "", shift.idOfOnCallPerson || ""]}
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
    },
    [],
  );

  if (error) {
    return <List.EmptyView icon={Icon.XMarkCircle} title="Error" description={error.message} />;
  }

  return (
    <List
      navigationTitle={activeOncall && activeOncall.isCurrentlyOncall ? "You are oncall" : "You are not oncall"}
      searchBarPlaceholder="Search user..."
      isLoading={isLoading}
    >
      <List.Section title="My Oncalls">
        {myOncalls.map(
          (oncall, index) =>
            user &&
            oncall.idOfOnCallPerson === user._id && (
              <RenderShiftItem isMine={true} key={index} item={oncall} user={user} />
            ),
        )}
        {myOncalls.map(
          (oncall, index) =>
            // show oncalls for current current user
            user &&
            oncall.idOfOnCallPerson !== user._id && (
              <RenderShiftItem isMine={false} key={index} item={oncall} user={user} />
            ),
        )}
      </List.Section>
    </List>
  );
};

export default MyOncalls;
