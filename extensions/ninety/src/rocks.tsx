import { Action, ActionPanel, Icon, Keyboard, List, showToast, Toast } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { queryRocks, updateRock } from "./api/ninety";
import { Rock, RockStatus } from "./api/types";
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
import { compact, dueDateAccessory, formatDate, htmlToText, ROCK_STATUSES, rockStatus } from "./lib/format";
import { NinetyUrls } from "./lib/urls";

const SECTION_ORDER: RockStatus[] = ["OFF_TRACK", "ON_TRACK", "DRAFT", "DONE", "CANCELED"];

function rockMarkdown(rock: Rock) {
  const lines = [`# ${rock.title}`];
  const description = htmlToText(rock.description);
  if (description) lines.push(description);
  const milestones = rock.milestones?.filter((m) => !m.isDeleted) ?? [];
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

export default function Command() {
  const { teams, teamName } = useTeams();
  const { userName } = useUsers();
  const [scope, setScope] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const isMine = scope === MY_ITEMS;
  const { userId, isLoading: isLoadingMe } = useMe();

  const { data, isLoading, mutate, revalidate } = useCachedPromise(
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
      isLoading={isLoading || !scope || (isMine && isLoadingMe)}
      isShowingDetail={showDetail && rocks.length > 0}
      searchBarPlaceholder="Filter Rocks"
      searchBarAccessory={<TeamDropdown id="rocks-scope" teams={teams} onChange={setScope} mineTitle="My Rocks" />}
    >
      <List.EmptyView
        icon={Icon.Mountain}
        title="No Rocks this quarter"
        description="Press ⌘N to create one."
        actions={<ActionPanel>{createAction}</ActionPanel>}
      />
      {SECTION_ORDER.map((status) => {
        const items = rocks.filter((rock) => rock.statusCode === status);
        if (!items.length) return null;
        return (
          <List.Section key={status} title={rockStatus(status).title} subtitle={String(items.length)}>
            {items.map((rock) => {
              const milestones = rock.milestones?.filter((m) => !m.isDeleted) ?? [];
              const done = milestones.filter((m) => m.isDone).length;
              const owner = userName(rock.userId);
              const team = teamName(rock.teamId);
              return (
                <List.Item
                  key={rock._id}
                  title={rock.title}
                  subtitle={showDetail ? undefined : isMine ? team : owner}
                  icon={rockStatus(rock.statusCode).icon}
                  keywords={compact([owner, team])}
                  accessories={
                    showDetail
                      ? undefined
                      : compact<List.Item.Accessory>([
                          milestones.length
                            ? { icon: Icon.Flag, text: `${done}/${milestones.length}`, tooltip: "Milestones done" }
                            : undefined,
                          dueDateAccessory(rock.dueDate, rock.completed),
                        ])
                  }
                  detail={
                    <List.Item.Detail
                      markdown={rockMarkdown(rock)}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.TagList title="Status">
                            <List.Item.Detail.Metadata.TagList.Item
                              text={rockStatus(rock.statusCode).title}
                              color={rockStatus(rock.statusCode).color}
                            />
                          </List.Item.Detail.Metadata.TagList>
                          <List.Item.Detail.Metadata.Label title="Owner" text={owner ?? "—"} />
                          <List.Item.Detail.Metadata.Label title="Team" text={team ?? "—"} />
                          <List.Item.Detail.Metadata.Label title="Due" text={formatDate(rock.dueDate)} />
                          {milestones.length ? (
                            <List.Item.Detail.Metadata.Label
                              title="Milestones"
                              text={`${done} of ${milestones.length} done`}
                            />
                          ) : null}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                  actions={
                    <ActionPanel>
                      <ActionPanel.Section>
                        <Action.Push
                          title="View Milestones"
                          icon={Icon.Flag}
                          target={<MilestoneList rock={rock} onChange={() => revalidate()} />}
                        />
                        <ActionPanel.Submenu
                          title="Set Status"
                          icon={Icon.Circle}
                          shortcut={Keyboard.Shortcut.Common.Duplicate}
                        >
                          {ROCK_STATUSES.filter((s) => s.value !== "DRAFT").map((s) => (
                            <Action
                              key={s.value}
                              title={s.title}
                              icon={s.icon}
                              onAction={() => setStatus(rock, s.value)}
                            />
                          ))}
                        </ActionPanel.Submenu>
                        <Action
                          title={showDetail ? "Hide Details" : "Show Details"}
                          icon={Icon.Sidebar}
                          shortcut={{
                            macOS: { modifiers: ["cmd"], key: "d" },
                            Windows: { modifiers: ["ctrl"], key: "d" },
                          }}
                          onAction={() => setShowDetail((v) => !v)}
                        />
                        <Action.OpenInBrowser title="Open in Ninety" url={NinetyUrls.rocks} />
                      </ActionPanel.Section>
                      <ActionPanel.Section>
                        <Action.Push
                          title="Add Milestone"
                          icon={Icon.PlusCircle}
                          shortcut={{
                            macOS: { modifiers: ["cmd", "shift"], key: "n" },
                            Windows: { modifiers: ["ctrl", "shift"], key: "n" },
                          }}
                          target={<MilestoneForm rock={rock} onSaved={() => revalidate()} />}
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
                          onAction={() => revalidate()}
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
