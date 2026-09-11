import {
  List,
  Icon,
  Color,
  ActionPanel,
  Action,
  showToast,
  Toast,
} from "@raycast/api";
import { useState, useRef, useMemo } from "react";
import { useCachedPromise } from "@raycast/utils";
import {
  HakunaClient,
  OverviewResponse,
  CompanyResponse,
  UserResponse,
} from "./hakuna-api";
import { formatOvertime, FORTY_HOURS, TEN_HOURS } from "./duration";
import { getSettings } from "./settings";
import AbsencesCommand from "./absences";

function overtimeIcon(seconds: number): { source: Icon; tintColor: string } {
  const abs = Math.abs(seconds);
  const source = abs >= FORTY_HOURS ? Icon.ExclamationMark : Icon.Clock;
  const tintColor =
    abs >= TEN_HOURS
      ? seconds > 0
        ? Color.Green
        : Color.Red
      : Color.SecondaryText;
  return { source, tintColor };
}

function ToggleInactiveAction({
  showInactive,
  onToggle,
}: {
  showInactive: boolean;
  onToggle: () => void;
}) {
  return (
    <Action
      title={showInactive ? "Hide Inactive Members" : "Show Inactive Members"}
      icon={showInactive ? Icon.EyeDisabled : Icon.Eye}
      shortcut={{
        macOS: { modifiers: ["cmd"], key: "i" },
        Windows: { modifiers: ["ctrl"], key: "i" },
      }}
      onAction={onToggle}
    />
  );
}

function OverviewMetadata({
  overview,
  company,
}: {
  overview: OverviewResponse;
  company: CompanyResponse;
}) {
  const abs = Math.abs(overview.overtime_in_seconds);
  const overtimeLabel = formatOvertime(
    overview.overtime_in_seconds,
    company.duration_format,
  );
  const textColor =
    abs >= TEN_HOURS
      ? overview.overtime_in_seconds > 0
        ? Color.Green
        : Color.Red
      : undefined;
  return (
    <>
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Overtime"
        text={
          textColor ? { value: overtimeLabel, color: textColor } : overtimeLabel
        }
        icon={overtimeIcon(overview.overtime_in_seconds)}
      />
      <List.Item.Detail.Metadata.Separator />
      <List.Item.Detail.Metadata.Label
        title="Vacation Days Total"
        text={String(
          overview.vacation.redeemed_days + overview.vacation.remaining_days,
        )}
      />
      <List.Item.Detail.Metadata.Label
        title="Vacation Days Used"
        text={String(overview.vacation.redeemed_days)}
      />
      <List.Item.Detail.Metadata.Label
        title="Vacation Days Remaining"
        text={
          overview.vacation.remaining_days < 0
            ? {
                value: String(overview.vacation.remaining_days),
                color: Color.Red,
              }
            : String(overview.vacation.remaining_days)
        }
      />
    </>
  );
}

function UserDetailMetadata({
  user,
  showGroups,
}: {
  user: UserResponse;
  showGroups: boolean;
}) {
  const statusColor = user.status === "active" ? Color.Green : Color.Red;
  return (
    <>
      {user.email ? (
        <List.Item.Detail.Metadata.Link
          title="Email"
          text={user.email}
          target={`mailto:${user.email}`}
        />
      ) : (
        <List.Item.Detail.Metadata.Label
          title="Email"
          text={user.email ?? "—"}
        />
      )}
      <List.Item.Detail.Metadata.Label
        title="Status"
        text={{ value: user.status, color: statusColor }}
        icon={{ source: Icon.Dot, tintColor: statusColor }}
      />
      {showGroups &&
        (user.groups.length > 0 ? (
          <List.Item.Detail.Metadata.TagList title="Groups">
            {user.groups.map((g) => (
              <List.Item.Detail.Metadata.TagList.Item key={g} text={g} />
            ))}
          </List.Item.Detail.Metadata.TagList>
        ) : (
          <List.Item.Detail.Metadata.Label title="Groups" text="—" />
        ))}
    </>
  );
}

function MeItem({
  user,
  overview,
  company,
  showGroups,
  showInactive,
  onToggle,
}: {
  user: UserResponse;
  overview: OverviewResponse;
  company: CompanyResponse;
  showGroups: boolean;
  showInactive: boolean;
  onToggle: () => void;
}) {
  return (
    <List.Item
      id="me"
      title={user.name}
      subtitle={user.email}
      icon={Icon.Person}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <UserDetailMetadata user={user} showGroups={showGroups} />
              <OverviewMetadata overview={overview} company={company} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Absences"
            icon={Icon.AirplaneTakeoff}
            target={<AbsencesCommand />}
          />
          <ToggleInactiveAction
            showInactive={showInactive}
            onToggle={onToggle}
          />
        </ActionPanel>
      }
    />
  );
}

function TeammateItem({
  user,
  overview,
  company,
  showGroups,
  showInactive,
  onToggle,
}: {
  user: UserResponse;
  overview: OverviewResponse | undefined;
  company: CompanyResponse;
  showGroups: boolean;
  showInactive: boolean;
  onToggle: () => void;
}) {
  return (
    <List.Item
      id={String(user.id)}
      title={user.name}
      subtitle={user.email}
      icon={user.status === "active" ? Icon.Person : Icon.PersonCircle}
      detail={
        <List.Item.Detail
          metadata={
            <List.Item.Detail.Metadata>
              <UserDetailMetadata user={user} showGroups={showGroups} />
              {overview && (
                <OverviewMetadata overview={overview} company={company} />
              )}
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          <Action.Push
            title="Show Absences"
            icon={Icon.AirplaneTakeoff}
            target={<AbsencesCommand userId={user.id} userName={user.name} />}
          />
          <ToggleInactiveAction
            showInactive={showInactive}
            onToggle={onToggle}
          />
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { apiToken } = getSettings();
  const [showInactive, setShowInactive] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [teammateOverviews, setTeammateOverviews] = useState<
    Record<number, OverviewResponse>
  >({});
  const fetchingRef = useRef<Set<number>>(new Set());

  const { data: me, isLoading: meLoading } = useCachedPromise(
    (token: string) => new HakunaClient(token).getMe(),
    [apiToken],
  );
  const { data: users, isLoading: usersLoading } = useCachedPromise(
    (token: string) => new HakunaClient(token).getUsers(),
    [apiToken],
  );
  const { data: overview, isLoading: overviewLoading } = useCachedPromise(
    (token: string) => new HakunaClient(token).getOverview(),
    [apiToken],
  );
  const { data: company, isLoading: companyLoading } = useCachedPromise(
    (token: string) => new HakunaClient(token).getCompany(),
    [apiToken],
  );

  const isLoading =
    meLoading || usersLoading || overviewLoading || companyLoading;
  const allTeammates = users && me ? users.filter((u) => u.id !== me.id) : [];

  const allGroups = useMemo(() => {
    const groups = new Set<string>();
    (users ?? []).forEach((u) => u.groups.forEach((g) => groups.add(g)));
    return Array.from(groups).sort();
  }, [users]);

  const hasAnyGroups = allGroups.length > 0;

  const inGroup = (u: UserResponse) =>
    selectedGroup === "all" || u.groups.includes(selectedGroup);
  const activeTeammates = allTeammates.filter(
    (u) => u.status === "active" && inGroup(u),
  );
  const inactiveTeammates = allTeammates.filter(
    (u) => u.status !== "active" && inGroup(u),
  );

  const toggleInactive = () => setShowInactive((v) => !v);

  function handleSelectionChange(id: string | null) {
    if (!id || id === "me") return;
    const userId = parseInt(id, 10);
    if (
      isNaN(userId) ||
      teammateOverviews[userId] ||
      fetchingRef.current.has(userId)
    )
      return;
    fetchingRef.current.add(userId);
    new HakunaClient(apiToken)
      .getOverview(userId)
      .then((data) =>
        setTeammateOverviews((prev) => ({ ...prev, [userId]: data })),
      )
      .catch(async (error) => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load teammate overview",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      })
      .finally(() => fetchingRef.current.delete(userId));
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle="Profiles"
      onSelectionChange={handleSelectionChange}
      searchBarAccessory={
        allGroups.length > 0 ? (
          <List.Dropdown tooltip="Filter by Group" onChange={setSelectedGroup}>
            <List.Dropdown.Item title="All Groups" value="all" />
            {allGroups.map((g) => (
              <List.Dropdown.Item key={g} title={g} value={g} />
            ))}
          </List.Dropdown>
        ) : undefined
      }
    >
      {me && overview && company && (
        <List.Section title="Me">
          <MeItem
            user={me}
            overview={overview}
            company={company}
            showGroups={hasAnyGroups}
            showInactive={showInactive}
            onToggle={toggleInactive}
          />
        </List.Section>
      )}
      {activeTeammates.length > 0 && company && (
        <List.Section title="Team">
          {activeTeammates.map((user) => (
            <TeammateItem
              key={user.id}
              user={user}
              overview={teammateOverviews[user.id]}
              company={company}
              showGroups={hasAnyGroups}
              showInactive={showInactive}
              onToggle={toggleInactive}
            />
          ))}
        </List.Section>
      )}
      {showInactive && inactiveTeammates.length > 0 && company && (
        <List.Section title="Inactive">
          {inactiveTeammates.map((user) => (
            <TeammateItem
              key={user.id}
              user={user}
              overview={teammateOverviews[user.id]}
              company={company}
              showGroups={hasAnyGroups}
              showInactive={showInactive}
              onToggle={toggleInactive}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
