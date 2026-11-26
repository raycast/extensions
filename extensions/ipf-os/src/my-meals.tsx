import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  LaunchType,
  List,
  launchCommand,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getAbsences, getMealsHistory } from "./lib/api/meals";
import { useSession } from "./lib/hooks/use-session";
import { mealsWebUrl } from "./lib/config";
import { mealsAccountKey, readMealDraft } from "./lib/meals/drafts";
import {
  DAYS,
  WEEKDAYS,
  addDays,
  currentMonday,
  dateLabel,
  eatTime,
  eatToday,
  weekLabel,
  windowLabel,
} from "./lib/meals/planning";
import { loadMealsOverview } from "./lib/meals/service";
import { refreshMealsStatus } from "./lib/meals/status";
import type { AbsenceNotice, HistorySelection, MealsMenu, MealSelection } from "./lib/meals/schemas";
import { AuthErrorView } from "./views/auth-error";
import { MealAbsenceForm } from "./views/meals/absence";
import { MealsError } from "./views/meals/common";
import { MealPreferences } from "./views/meals/preferences";

async function loadHistory(account: string) {
  const entries = await getMealsHistory();
  return { account, entries: entries.sort((a, b) => b.week_start.localeCompare(a.week_start)) };
}
async function loadAbsences(_account: string, from: string, to: string) {
  return getAbsences(from, to);
}
const openPlanner = () => launchCommand({ name: "plan-my-meals", type: LaunchType.UserInitiated });

export default function MyMealsCommand() {
  const { session, error, revalidate } = useSession();
  if (error) return <AuthErrorView error={error} onRetry={revalidate} />;
  if (!session) return <List isLoading />;
  return <MyMeals key={mealsAccountKey(session.subject)} account={mealsAccountKey(session.subject)} />;
}

function MyMeals({ account }: { account: string }) {
  const { push } = useNavigation();
  const [scope, setScope] = useState<"current" | "next" | "history">("current");
  const [selectedId, setSelectedId] = useState<string | undefined>(eatToday);
  const [searchText, setSearchText] = useState("");
  const { data, error, isLoading, revalidate } = useCachedPromise(loadMealsOverview, [account], {
    keepPreviousData: false,
  });
  const history = useCachedPromise(loadHistory, [account], { execute: scope === "history", keepPreviousData: false });
  const from = data?.currentMenu?.week_start.slice(0, 10) ?? currentMonday();
  const to = addDays(from, 11);
  const absences = useCachedPromise(loadAbsences, [account, from, to], {
    execute: Boolean(data),
    keepPreviousData: false,
  });
  const today = eatToday();
  const target = data?.dashboard.nextWeekPlan;
  const draft = useCachedPromise(readMealDraft, [account, target?.id ?? ""], {
    execute: Boolean(target),
    keepPreviousData: false,
  });
  const refresh = () => {
    void refreshMealsStatus();
    revalidate();
    if (scope === "history") history.revalidate();
    absences.revalidate();
    draft.revalidate();
  };
  if (!data && error) return <MealsError error={error} onRetry={refresh} />;
  if (!data) return <List isLoading searchText={searchText} onSearchTextChange={setSearchText} />;
  const selected = scope === "current" ? data.dashboard.myCurrentSelection : data.nextSelection;
  const menu = scope === "current" ? data.currentMenu : data.nextMenu;
  const week = menu?.week_start.slice(0, 10) ?? (scope === "next" ? addDays(from, 7) : from);
  const weekSelection = selected;
  const planningTitle = draft.data
    ? "Review Your Draft"
    : data.dashboard.myNextSelection
      ? "View Submitted Plan"
      : !data.profile.isAvailableNextWeek
        ? "Manage Availability"
        : "Plan My Meals";
  const plannerAction = <Action title="Open Planner" icon={Icon.Calendar} onAction={openPlanner} />;
  const commonActions = (
    <>
      <Action.Push
        title="Meal Preferences"
        icon={Icon.Gear}
        target={<MealPreferences profile={data.profile} onSaved={refresh} />}
      />
      <Action.Push
        title="Notify Absence"
        icon={Icon.Calendar}
        target={<MealAbsenceForm account={account} onSaved={refresh} />}
      />
      <Action.OpenInBrowser title="Open Meals in IPF OS" url={mealsWebUrl()} />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={refresh}
      />
    </>
  );
  return (
    <List
      isLoading={isLoading || history.isLoading || absences.isLoading}
      isShowingDetail
      navigationTitle={`My Meals${scope === "history" ? " · History" : ` · ${weekLabel(week)}`}`}
      selectedItemId={selectedId}
      onSelectionChange={(id) => setSelectedId(id ?? "")}
      searchBarPlaceholder="Find a weekday or meal"
      searchText={searchText}
      onSearchTextChange={(value) => {
        setSearchText(value);
        if (!value) setSelectedId(scope === "current" ? today : undefined);
      }}
      filtering
      searchBarAccessory={
        <List.Dropdown
          tooltip="Meal week"
          value={scope}
          onChange={(value) => {
            if (value === "current" || value === "next" || value === "history") {
              setSelectedId(value === "current" ? today : undefined);
              setSearchText("");
              setScope(value);
            }
          }}
        >
          <List.Dropdown.Item value="current" title="This Week" />
          <List.Dropdown.Item value="next" title="Next Week" />
          <List.Dropdown.Item value="history" title="History" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title={
          scope === "history" && history.isLoading && !history.data
            ? "Loading meal history…"
            : scope === "history" && !history.data?.entries.length && !searchText
              ? "No meal history yet"
              : "No matching weekdays or meals"
        }
        description={
          searchText ? "Try another meal name or clear the search." : "Your submitted weeks will appear here."
        }
        actions={
          <ActionPanel>
            {searchText && <Action title="Clear Search" onAction={() => setSearchText("")} />}
            {plannerAction}
            {commonActions}
          </ActionPanel>
        }
      />
      {(error || absences.error || draft.error) && (
        <List.Section title="Connection">
          <List.Item
            title="Could Not Refresh All Meals Data"
            subtitle={`Last checked ${eatTime(data.fetchedAt)}`}
            icon={Icon.Warning}
            detail={
              <List.Item.Detail
                markdown={`# Showing Last Known Meals\n\nLast checked ${eatTime(data.fetchedAt)}.\n\n${[error?.message, absences.error?.message, draft.error?.message].filter(Boolean).join("\n\n")}\n\nYour draft is retained. Refresh before relying on the latest selection or absence status.`}
              />
            }
            actions={
              <ActionPanel>
                <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={refresh} />
                {plannerAction}
                <Action.OpenInBrowser title="Open Meals in IPF OS" url={mealsWebUrl()} />
              </ActionPanel>
            }
          />
        </List.Section>
      )}
      {scope === "history" ? (
        <>
          {history.error && (
            <List.Item
              title="Could Not Refresh History"
              subtitle={history.error.message}
              icon={Icon.Warning}
              actions={
                <ActionPanel>
                  <Action title="Try Again" onAction={history.revalidate} />
                </ActionPanel>
              }
            />
          )}
          {history.data?.entries.map((entry) => (
            <List.Item
              key={entry.id}
              title={weekLabel(entry.week_start)}
              subtitle={entry.cancelled ? "Cancelled" : "Saved"}
              keywords={entry.items.flatMap((item) => [item.main_name ?? "", item.side_name ?? ""])}
              icon={entry.cancelled ? Icon.MinusCircle : Icon.Clock}
              detail={<List.Item.Detail markdown={historyMarkdown(entry)} />}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Week"
                    icon={Icon.Eye}
                    target={
                      <Detail
                        navigationTitle={weekLabel(entry.week_start)}
                        markdown={historyMarkdown(entry)}
                        actions={
                          <ActionPanel>
                            {plannerAction}
                            {commonActions}
                          </ActionPanel>
                        }
                      />
                    }
                  />
                  {plannerAction}
                  {commonActions}
                </ActionPanel>
              }
            />
          ))}
        </>
      ) : (
        <List.Section
          title={scope === "current" ? "This Week" : "Next Week"}
          subtitle={weekSelection ? `Saved ${eatTime(weekSelection.submitted_at)}` : "No saved selection"}
        >
          {DAYS.map((day) => {
            const date = addDays(week, day - 1);
            const item = weekSelection?.items.find((item) => item.day === day);
            const hasMenu = menu?.items.some((item) => item.day === day && item.role === "main");
            const state = item?.main_id
              ? "Saved choice"
              : weekSelection
                ? "Skipped"
                : hasMenu
                  ? "No saved selection"
                  : "No menu available";
            const label = item?.main_name ? [item.main_name, item.side_name].filter(Boolean).join(" · ") : state;
            const notice = absences.data?.find((notice) => notice.date === date);
            const markdown = [
              dayMarkdown(day, date, label, state, menu, weekSelection, notice),
              `Last checked ${eatTime(data.fetchedAt)}`,
              error ? `**Could not refresh meals:** ${error.message}` : "",
              absences.error ? `**Could not refresh absence notices:** ${absences.error.message}` : "",
            ]
              .filter(Boolean)
              .join("\n\n");
            return (
              <List.Item
                key={date}
                id={date}
                title={`${WEEKDAYS[day - 1].slice(0, 3)} ${dateLabel(date)}`}
                subtitle={label}
                keywords={[
                  WEEKDAYS[day - 1],
                  label,
                  state,
                  date === today ? "today" : "",
                  ...(menu?.items.filter((item) => item.day === day).map((item) => item.name) ?? []),
                ]}
                icon={{
                  source: notice ? Icon.Calendar : item?.main_id ? Icon.CheckCircle : Icon.Circle,
                  tintColor: notice ? Color.Orange : item?.main_id ? Color.Green : Color.SecondaryText,
                }}
                accessories={[
                  ...(date === today ? [{ icon: Icon.Star, tooltip: "Today" }] : []),
                  ...(notice
                    ? [
                        {
                          icon: Icon.Calendar,
                          tooltip: notice.onTime ? "Absence notice · on time" : "Absence notice · late",
                        },
                      ]
                    : []),
                ]}
                detail={<List.Item.Detail markdown={markdown} />}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Meals"
                      icon={Icon.Eye}
                      target={
                        <Detail
                          navigationTitle={WEEKDAYS[day - 1]}
                          markdown={markdown}
                          actions={
                            <ActionPanel>
                              {plannerAction}
                              {commonActions}
                            </ActionPanel>
                          }
                        />
                      }
                    />
                    {date >= today && !notice && (
                      <Action.Push
                        title="Notify Absence for This Day"
                        icon={Icon.Calendar}
                        target={<MealAbsenceForm account={account} date={date} onSaved={refresh} />}
                      />
                    )}
                    {plannerAction}
                    {commonActions}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
      {scope !== "history" && (
        <List.Section title="Planning" subtitle={data.dashboard.windowStatus.canSubmit ? "Open" : "Closed"}>
          <List.Item
            title={planningTitle}
            subtitle={target ? `Target week ${weekLabel(target.week_start)}` : "Waiting for the menu"}
            icon={Icon.Calendar}
            detail={
              <List.Item.Detail
                markdown={[
                  "# Planning Target",
                  target ? `**${weekLabel(target.week_start)}**` : "No target menu is available yet.",
                  windowLabel(data.dashboard.windowStatus),
                  data.dashboard.windowStatus.reason ?? "",
                  draft.data
                    ? "**You have an unsubmitted draft.**"
                    : data.dashboard.myNextSelection
                      ? "Your target-week plan has been submitted."
                      : "No meals have been submitted for the target week.",
                  error
                    ? `Could not refresh: ${error.message}. Showing saved data.`
                    : `Last checked ${eatTime(data.fetchedAt)}`,
                  absences.error ? `Could not refresh absence notices: ${absences.error.message}` : "",
                ]
                  .filter(Boolean)
                  .join("\n\n")}
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title={planningTitle}
                  icon={Icon.Calendar}
                  onAction={() =>
                    planningTitle === "Manage Availability"
                      ? push(<MealPreferences profile={data.profile} onSaved={refresh} />)
                      : openPlanner()
                  }
                />
                {commonActions}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}

function dayMarkdown(
  day: number,
  date: string,
  label: string,
  state: string,
  menu: MealsMenu | null,
  selection: MealSelection | null,
  notice: AbsenceNotice | undefined,
): string {
  const offered = menu?.items.filter((item) => item.day === day) ?? [];
  return [
    `# ${WEEKDAYS[day - 1]} ${dateLabel(date)}`,
    `## Your Meal\n${label}`,
    label !== state ? `**${state}**${selection ? ` · Saved ${eatTime(selection.submitted_at)}` : ""}` : "",
    notice
      ? `## Absence Notice\nRecorded ${eatTime(notice.notifiedAt)} · **${notice.onTime ? "On time" : "Late"}**${notice.reason ? `\n\n${notice.reason}` : ""}`
      : "",
    offered.length
      ? "## Offered Menu\n" +
        offered
          .map(
            (item) =>
              `- ${item.name}${item.special ? " · Complete dish" : item.role === "side" ? " · Side" : ""}${item.note ? ` — ${item.note}` : ""}`,
          )
          .join("\n")
      : "No menu is available for this day.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
function historyMarkdown(entry: HistorySelection): string {
  return [
    `# ${weekLabel(entry.week_start)}`,
    `**${entry.cancelled ? "Cancelled · historical choices only" : "Saved"}** · ${eatTime(entry.submitted_at)}`,
    ...DAYS.map((day) => {
      const choice = entry.items.find((item) => item.day === day);
      return `- **${WEEKDAYS[day - 1]}:** ${choice?.main_name ? [choice.main_name, choice.side_name].filter(Boolean).join(" · ") : "Skipped"}`;
    }),
  ].join("\n\n");
}
