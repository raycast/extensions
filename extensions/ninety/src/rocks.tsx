import { Action, ActionPanel, Color, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { getMilestonesForRocks, queryRocks, updateRock } from "./api/ninety";
import { Milestone, Rock, RockStatus } from "./api/types";
import { ErrorView } from "./components/ErrorView";
import { IssueForm } from "./components/IssueForm";
import { MilestoneForm } from "./components/MilestoneForm";
import { MilestoneList } from "./components/MilestoneList";
import { RockForm } from "./components/RockForm";
import { MY_ITEMS, TeamDropdown } from "./components/TeamDropdown";
import { TodoForm } from "./components/TodoForm";
import { useMe } from "./hooks/useMe";
import { useTeams } from "./hooks/useTeams";
import { useUsers } from "./hooks/useUsers";
import { showError } from "./lib/errors";
import { compact, dueDateAccessory, formatDate, htmlToMarkdown, ROCK_STATUSES, rockStatus } from "./lib/format";
import { NinetyUrls } from "./lib/urls";
import { useAvatar } from "./hooks/useAvatar";
import { UPDATE_SHORTCUT } from "./lib/shortcuts";

/** Within a section, Rocks that need attention come first. */
const STATUS_ORDER: RockStatus[] = ["OFF_TRACK", "ON_TRACK", "DRAFT", "DONE", "CANCELED"];

function byStatusThenDue(a: Rock, b: Rock) {
  const status = STATUS_ORDER.indexOf(a.statusCode) - STATUS_ORDER.indexOf(b.statusCode);
  return status || new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime();
}

interface RockSection {
  key: string;
  title: string;
  rocks: Rock[];
}

/**
 * Groups Rocks the way Ninety's Rocks page does: Company, then Department, then one section per
 * person for individual Rocks (you first). "Company & Department" Rocks sit under Company.
 */
function groupRocks(rocks: Rock[], userName: (id?: string) => string | undefined, meId?: string): RockSection[] {
  const company = rocks.filter((r) => r.levelCode === "COMPANY" || r.levelCode === "COMPANY_AND_DEPARTMENT");
  const department = rocks.filter((r) => r.levelCode === "DEPARTMENT");
  const individual = rocks.filter((r) => !company.includes(r) && !department.includes(r));

  const byOwner = new Map<string, Rock[]>();
  for (const rock of individual) byOwner.set(rock.userId ?? "", [...(byOwner.get(rock.userId ?? "") ?? []), rock]);
  const people = [...byOwner.entries()]
    .map(([ownerId, items]) => ({ ownerId, name: userName(ownerId) ?? "Unassigned", items }))
    .sort((a, b) => Number(b.ownerId === meId) - Number(a.ownerId === meId) || a.name.localeCompare(b.name));

  return [
    { key: "company", title: "Company Rocks", rocks: company },
    { key: "department", title: "Department Rocks", rocks: department },
    ...people.map((p) => ({ key: `person-${p.ownerId}`, title: p.name, rocks: p.items })),
  ]
    .filter((section) => section.rocks.length)
    .map((section) => ({ ...section, rocks: [...section.rocks].sort(byStatusThenDue) }));
}

function rockMarkdown(rock: Rock, milestones: Milestone[]) {
  const lines = [`## ${rock.title}`];
  const description = htmlToMarkdown(rock.description);
  if (description) lines.push(description);
  if (milestones.length) {
    lines.push("### Milestones");
    lines.push(
      milestones
        .map((m) => `- ${m.isDone ? "✅" : "⬜️"} ${m.title}${m.dueDate ? ` — ${formatDate(m.dueDate)}` : ""}`)
        .join("\n"),
    );
  }
  return lines.join("\n\n");
}

function byDueDate(a: Milestone, b: Milestone) {
  return new Date(a.dueDate ?? 0).getTime() - new Date(b.dueDate ?? 0).getTime();
}

function milestoneProgress(milestones: Milestone[]) {
  const done = milestones.filter((m) => m.isDone).length;
  const total = milestones.length;
  const percent = total ? Math.round((done / total) * 100) : 0;
  return { done, total, percent, summary: `${done} of ${total} done (${percent}%)` };
}

export default function Command() {
  const { avatar, ownerAccessory } = useAvatar();
  const { teams, teamName, error: teamsError, revalidate: retryTeams } = useTeams();
  const { userName } = useUsers();
  const [scope, setScope] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const isMine = scope === MY_ITEMS;
  const { userId, isLoading: isLoadingMe, error: meError, revalidate: retryMe } = useMe();

  const { data, isLoading, error, mutate, revalidate } = useCachedPromise(
    (scope: string, userId?: string) =>
      queryRocks(scope === MY_ITEMS ? { userId, futureScope: "Current" } : { teamId: scope, futureScope: "Current" }),
    [scope, userId],
    {
      execute: !!scope && (scope !== MY_ITEMS || !!userId),
      keepPreviousData: true,
      onError: (error) => {
        showError(error, "Couldn't load Rocks");
      },
    },
  );
  const rocks = data ?? [];

  // Rock list results leave Milestones out, so load them for every Rock shown.
  const rockIds = rocks.map((rock) => rock._id);
  const {
    data: milestonesByRock,
    isLoading: isLoadingMilestones,
    revalidate: refreshMilestones,
  } = useCachedPromise(getMilestonesForRocks, [rockIds], {
    execute: rockIds.length > 0,
    keepPreviousData: true,
    onError: () => undefined,
  });
  const milestonesFor = (rock: Rock) =>
    [...(milestonesByRock?.[rock._id] ?? rock.milestones ?? [])].filter((m) => !m.isDeleted).sort(byDueDate);
  const milestonesChanged = () => {
    refreshMilestones();
    revalidate();
  };
  const loadError = teamsError ?? (isMine ? meError : undefined) ?? error;
  const retry = () => (teamsError ? retryTeams() : isMine && meError ? retryMe() : revalidate());

  async function setStatus(rock: Rock, statusCode: RockStatus) {
    try {
      await mutate(updateRock(rock._id, { statusCode }), {
        optimisticUpdate: (current) => current?.map((r) => (r._id === rock._id ? { ...r, statusCode } : r)),
      });
      await showToast({ style: Toast.Style.Success, title: `Rock is ${rockStatus(statusCode).title}` });
    } catch (error) {
      await showError(error, "Couldn't update Rock");
    }
  }

  const createAction = (
    <Action.Push
      title="Create Rock"
      icon={Icon.Plus}
      shortcut={Keyboard.Shortcut.Common.New}
      target={<RockForm defaultTeamId={isMine ? undefined : scope} onSaved={() => revalidate()} />}
    />
  );

  return (
    <List
      isLoading={!loadError && (isLoading || !scope || (isMine && isLoadingMe))}
      isShowingDetail={showDetail && rocks.length > 0}
      searchBarPlaceholder="Filter Rocks"
      searchBarAccessory={<TeamDropdown id="rocks-scope" teams={teams} onChange={setScope} mineTitle="My Rocks" />}
    >
      {loadError ? (
        <ErrorView
          title={
            teamsError ? "Couldn't load Teams" : meError && isMine ? "Couldn't identify you" : "Couldn't load Rocks"
          }
          error={loadError}
          onRetry={retry}
        />
      ) : (
        <List.EmptyView
          icon={Icon.Mountain}
          title="No Rocks this quarter"
          description="Press ⌘N to create one."
          actions={<ActionPanel>{createAction}</ActionPanel>}
        />
      )}
      {groupRocks(rocks, userName, userId).map((section) => {
        return (
          <List.Section key={section.key} title={section.title} subtitle={String(section.rocks.length)}>
            {section.rocks.map((rock) => {
              const milestones = milestonesFor(rock);
              const progress = milestoneProgress(milestones);
              const milestonesLoaded = !!milestonesByRock?.[rock._id] || !isLoadingMilestones;
              const owner = userName(rock.userId);
              const team = teamName(rock.teamId);
              return (
                <List.Item
                  key={rock._id}
                  title={rock.title}
                  subtitle={showDetail || !isMine ? undefined : team}
                  icon={rockStatus(rock.statusCode).icon}
                  keywords={compact([owner, team])}
                  accessories={
                    showDetail
                      ? undefined
                      : compact<List.Item.Accessory>([
                          progress.total
                            ? {
                                icon: getProgressIcon(
                                  progress.done / progress.total,
                                  progress.done === progress.total ? Color.Green : Color.Blue,
                                ),
                                text: `${progress.done}/${progress.total}`,
                                tooltip: `Milestones: ${progress.summary}`,
                              }
                            : undefined,
                          rock.levelCode === "COMPANY_AND_DEPARTMENT"
                            ? { tag: "Company & Dept", tooltip: "Company and Department Rock" }
                            : undefined,
                          dueDateAccessory(rock.dueDate, rock.completed),
                          ownerAccessory(owner, rock.userId),
                        ])
                  }
                  detail={
                    <List.Item.Detail
                      isLoading={!milestonesLoaded}
                      markdown={rockMarkdown(rock, milestones)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Status">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={rockStatus(rock.statusCode).title}
                              color={rockStatus(rock.statusCode).color}
                            />
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Label
                            title="Owner"
                            text={owner ?? "—"}
                            icon={avatar(owner, rock.userId)}
                          />
                          <List.Item.Detail.Metadata.Label title="Team" text={team ?? "—"} />
                          <List.Item.Detail.Metadata.Label title="Due" text={formatDate(rock.dueDate)} />
                          <List.Item.Detail.Metadata.Label
                            title="Milestones"
                            text={!milestonesLoaded ? "Loading…" : progress.total ? progress.summary : "None"}
                            icon={
                              progress.total
                                ? getProgressIcon(
                                    progress.done / progress.total,
                                    progress.done === progress.total ? Color.Green : Color.Blue,
                                  )
                                : undefined
                            }
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action
                          title={showDetail ? "Hide Details" : "Show Details"}
                          icon={Icon.Sidebar}
                          onAction={() => setShowDetail((v) => !v)}
                        />
                        <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.rock(rock)} />
                        <Action.Push
                          title="View Milestones"
                          icon={Icon.Flag}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "m" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "m" },
                          }}
                          target={<MilestoneList rock={rock} onChange={milestonesChanged} />}
                        />
                        <ActionPanel.Submenu title="Set Status" icon={Icon.Circle} shortcut={UPDATE_SHORTCUT}>
                          {ROCK_STATUSES.filter((s) => s.value !== "DRAFT").map((s) => (
                            <Action
                              key={s.value}
                              title={s.title}
                              icon={s.icon}
                              onAction={() => setStatus(rock, s.value)}
                            />
                          ))}
                        </ActionPanel.Submenu>
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.Push
                          title="Add Milestone"
                          icon={Icon.PlusCircle}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "n" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "n" },
                          }}
                          target={<MilestoneForm rock={rock} onSaved={milestonesChanged} />}
                        />
                        <Action.Push
                          title="Create Linked To-Do"
                          icon={Icon.CheckList}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "t" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "t" },
                          }}
                          target={
                            <TodoForm
                              defaultTeamId={rock.teamId}
                              link={{ id: rock._id, type: "rock", title: rock.title }}
                            />
                          }
                        />
                        <Action.Push
                          title="Create Linked Issue"
                          icon={Icon.Bolt}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "i" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "i" },
                          }}
                          target={
                            <IssueForm
                              defaultTeamId={rock.teamId}
                              link={{ id: rock._id, type: "rock", title: rock.title }}
                            />
                          }
                        />
                        <Action.Push
                          title="Edit Rock"
                          icon={Icon.Pencil}
                          shortcut={Keyboard.Shortcut.Common.Edit}
                          target={<RockForm rock={rock} onSaved={() => revalidate()} />}
                        />
                        {createAction}
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.CopyToClipboard
                          title="Copy Title"
                          content={rock.title}
                          shortcut={Keyboard.Shortcut.Common.Copy}
                        />
                        <Action
                          title="Refresh"
                          icon={Icon.ArrowClockwise}
                          shortcut={Keyboard.Shortcut.Common.Refresh}
                          onAction={() => milestonesChanged()}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                />
              );
            })}
          </List.Section>
        );
      })}
    </List>
  );
}
