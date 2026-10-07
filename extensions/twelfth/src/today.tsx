import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { useCachedPromise, useCachedState, withAccessToken } from "@raycast/utils";
import { BUCKET_TITLES, type Bucket, dueLabel, groupActions, isMine, personName } from "./vendor/twelfth-shared/index";
import { authorize, signedInEmail } from "./lib/auth";
import { appUrl, askUrl } from "./lib/config";
import { workspaceContext } from "./lib/context";
import { type Action as TwelfthAction, listOpenActions } from "./lib/twelfth";

const BUCKET_COLORS: Record<Bucket, Color.ColorLike> = {
  overdue: Color.Red,
  today: Color.Orange,
  week: Color.Blue,
  next: Color.Purple,
  later: Color.SecondaryText,
  undated: Color.SecondaryText,
};

type Filter = "mine" | "all";

function Today() {
  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const [context, actions, email] = await Promise.all([workspaceContext(), listOpenActions(), signedInEmail()]);
    // Names as the person chose to see them in the app (full or first).
    const named = actions.map((action) => ({
      ...action,
      assigneeName: personName(action.assigneeName, context.nameFormat) ?? null,
    }));
    return { context, actions: named, email };
  });
  const [filter, setFilter] = useCachedState<Filter>("today.filter", "mine");
  const [showingDetail, setShowingDetail] = useCachedState("today.detail", false);

  const timeZone = data?.context.timeZone;
  const email = data?.email;
  const visible = (data?.actions ?? []).filter((action) => filter === "all" || isMine(action, email));
  const groups = groupActions(visible, timeZone, new Date(), data?.context.firstDayOfWeek);
  const now = new Date();
  const dueNow = groups.overdue.length + groups.today.length;

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showingDetail && visible.length > 0}
      navigationTitle={data?.context.workspace ? `Today · ${data.context.workspace.name}` : "Today"}
      searchBarPlaceholder={dueNow ? `${dueNow} to do today. Filter actions…` : "Filter actions…"}
      searchBarAccessory={
        email ? (
          <List.Dropdown tooltip="Whose actions" value={filter} onChange={(value) => setFilter(value as Filter)}>
            <List.Dropdown.Item title="Mine & Unassigned" value="mine" icon={Icon.Person} />
            <List.Dropdown.Item title="Everyone's" value="all" icon={Icon.TwoPeople} />
          </List.Dropdown>
        ) : undefined
      }
    >
      <List.EmptyView
        icon={Icon.CheckCircle}
        title={isLoading ? "Loading your actions…" : "Nothing open"}
        description={isLoading ? undefined : "No open actions in Twelfth. Enjoy the clear desk."}
        actions={
          <ActionPanel>
            <Action.OpenInBrowser title="Open Twelfth" url={appUrl("/app")} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
          </ActionPanel>
        }
      />
      {(Object.keys(BUCKET_TITLES) as Bucket[]).map((bucket) =>
        groups[bucket].length ? (
          <List.Section key={bucket} title={BUCKET_TITLES[bucket]} subtitle={String(groups[bucket].length)}>
            {groups[bucket].map((action) => (
              <ActionItem
                key={action.id}
                action={action}
                bucket={bucket}
                due={dueLabel(action, timeZone, now)}
                showingDetail={showingDetail}
                actions={
                  <ActionPanel>
                    <Action.OpenInBrowser
                      title="Open in Twelfth"
                      url={appUrl(`/app/tasks/${encodeURIComponent(action.id)}`)}
                    />
                    <Action
                      title={showingDetail ? "Hide Details" : "Show Details"}
                      icon={Icon.Sidebar}
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => setShowingDetail(!showingDetail)}
                    />
                    <Action.OpenInBrowser
                      title="Ask Twelfth About This"
                      icon={Icon.SpeechBubble}
                      shortcut={{ modifiers: ["cmd", "shift"], key: "k" }}
                      url={askUrl(helpPrompt(action))}
                    />
                    <ActionPanel.Section>
                      <Action.CopyToClipboard title="Copy Title" content={action.title} />
                      <Action.CopyToClipboard
                        title="Copy Link"
                        content={appUrl(`/app/tasks/${encodeURIComponent(action.id)}`)}
                        shortcut={Keyboard.Shortcut.Common.Copy}
                      />
                      <Action.OpenInBrowser
                        title="Open All Tasks"
                        icon={Icon.List}
                        url={appUrl("/app/tasks")}
                        shortcut={Keyboard.Shortcut.Common.OpenWith}
                      />
                      <Action
                        title="Refresh"
                        icon={Icon.ArrowClockwise}
                        shortcut={Keyboard.Shortcut.Common.Refresh}
                        onAction={revalidate}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : null,
      )}
    </List>
  );
}

function ActionItem(props: {
  action: TwelfthAction;
  bucket: Bucket;
  due: string | undefined;
  showingDetail: boolean;
  actions: React.ReactNode;
}) {
  const { action, bucket, due, showingDetail } = props;
  const accessories: List.Item.Accessory[] = showingDetail
    ? []
    : [
        ...(action.assigneeName ? [{ icon: Icon.Person, text: action.assigneeName, tooltip: "Assignee" }] : []),
        ...(due ? [{ tag: { value: due, color: BUCKET_COLORS[bucket] } }] : []),
      ];
  return (
    <List.Item
      title={action.title}
      subtitle={showingDetail ? undefined : (action.sourceTitle ?? undefined)}
      keywords={[action.sourceTitle, action.assigneeName, action.bookKey].filter((k): k is string => Boolean(k))}
      icon={{ source: bucket === "overdue" ? Icon.ExclamationMark : Icon.Circle, tintColor: BUCKET_COLORS[bucket] }}
      accessories={accessories}
      detail={<ActionDetail action={action} due={due} />}
      actions={props.actions}
    />
  );
}

function ActionDetail({ action, due }: { action: TwelfthAction; due: string | undefined }) {
  const markdown = [
    `## ${action.title}`,
    action.details ?? "",
    action.sourceSummary ? `---\n\n**${action.sourceTitle ?? "Context"}**\n\n${action.sourceSummary}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
  return (
    <List.Item.Detail
      markdown={markdown}
      metadata={
        <List.Item.Detail.Metadata>
          {due ? <List.Item.Detail.Metadata.Label title="Due" text={due} /> : null}
          <List.Item.Detail.Metadata.Label title="Assignee" text={action.assigneeName ?? "Unassigned"} />
          {action.bookKey ? <List.Item.Detail.Metadata.Label title="Remit" text={action.bookKey} /> : null}
          {action.sourceTitle ? <List.Item.Detail.Metadata.Label title="From" text={action.sourceTitle} /> : null}
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function helpPrompt(action: TwelfthAction) {
  const details = action.details ? `\n\n${action.details.slice(0, 600)}` : "";
  return `Help me with this action: ${action.title}${details}`;
}

export default withAccessToken({ authorize })(Today);
