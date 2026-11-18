import {
  Action,
  ActionPanel,
  AI,
  Color,
  Detail,
  Form,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { FormValidation, showFailureToast, useCachedState, useForm } from "@raycast/utils";
import { format } from "date-fns";
import { useState } from "react";
import {
  CopyActivityLogAction,
  CopyIdAction,
  CopyMessageAction,
  CopyPlanMarkdownAction,
  CopyPromptAction,
  CopyPrUrlAction,
  CopyStepDescriptionAction,
  CopySummaryAction,
  CopyUrlAction,
} from "./components/CopyActions";
import QuickMessageForm from "./components/QuickMessageForm";
import { useLastActivity } from "./hooks";
import {
  approvePlan,
  fetchSessionActivities,
  sendMessage,
  useSessionActivities,
  useSessions,
  useSources,
} from "./jules";
import { Plan, Session, SessionState } from "./types";
import {
  formatRepoName,
  formatSessionState,
  formatSessionTitle,
  getSessionAccessories,
  getActivityMarkdown,
  getActivityTitle,
  getStatusIconForSession,
  groupSessions,
} from "./utils";
import ViewMedia from "./view-media";

interface FileChange {
  filename: string;
  patch: string;
  displayPatch: string;
  source: string;
  commitMessage?: string;
  gitDiffCommand?: string;
}

function stripDiffHeader(patch: string): string {
  const lines = patch.split("\n");
  const filtered = lines.filter((line) => {
    if (line.startsWith("diff --git ")) return false;
    if (line.startsWith("index ")) return false;
    if (line.startsWith("--- ")) return false;
    if (line.startsWith("+++ ")) return false;
    return true;
  });

  const formatted = filtered.map((line) => {
    if (line.startsWith("@@ ")) {
      return line.replace(/^(@@ .+? @@) (.+)$/, "$1\n$2");
    }
    return line;
  });

  return formatted.join("\n").trim();
}

function parseUnidiffToFiles(unidiffPatch: string, source: string, commitMessage?: string): FileChange[] {
  const files: FileChange[] = [];
  const patches = unidiffPatch.split(/(?=^diff --git)/m).filter(Boolean);

  for (const patch of patches) {
    const match = patch.match(/^diff --git a\/(.*?) b\/(.*)$/m);
    if (match) {
      // Parse index line for commit range: "index abc123..def456"
      const indexMatch = patch.match(/^index ([a-f0-9]+)\.\.([a-f0-9]+)/m);
      const gitDiffCommand = indexMatch ? `git diff ${indexMatch[1]}..${indexMatch[2]} -- ${match[2]}` : undefined;

      const displayPatch = stripDiffHeader(patch);

      files.push({
        filename: match[2],
        patch: patch.trim(),
        displayPatch,
        source,
        commitMessage,
        gitDiffCommand,
      });
    }
  }

  // If no files found, treat entire patch as single file
  if (files.length === 0 && unidiffPatch.trim()) {
    const displayPatch = stripDiffHeader(unidiffPatch);
    files.push({
      filename: "Changes",
      patch: unidiffPatch.trim(),
      displayPatch,
      source,
      commitMessage,
    });
  }

  return files;
}

function FileDetailView(props: { file: FileChange; session: Session }) {
  const lineCount = props.file.displayPatch.split("\n").length;
  return (
    <Detail
      navigationTitle={props.file.filename}
      markdown={`# ${props.file.filename} [${lineCount} lines]\n\n\`\`\`diff\n${props.file.displayPatch}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy File Diff" content={props.file.patch} />
          {props.file.gitDiffCommand && (
            <Action.CopyToClipboard title="Copy Git Diff Command" content={props.file.gitDiffCommand} />
          )}
          <Action.OpenInBrowser url={props.session.url} title="Open Session in Browser" />
        </ActionPanel>
      }
    />
  );
}

function ApprovePrAction(props: { prUrl: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Approve Command"
      icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
      content={`gh pr review --approve ${props.prUrl}`}
      shortcut={{ modifiers: ["cmd", "shift"], key: "a" }}
    />
  );
}

function MergePrAction(props: { prUrl: string }) {
  return (
    <Action.CopyToClipboard
      title="Copy Merge Command"
      icon={{ source: Icon.ArrowRight, tintColor: Color.Purple }}
      content={`gh pr merge --squash ${props.prUrl}`}
    />
  );
}

function CodeReviewPage(props: { session: Session }) {
  const { data: activities, isLoading, revalidate } = useSessionActivities(props.session.name);
  const prUrl = props.session.outputs?.find((o) => o.pullRequest)?.pullRequest?.url;

  const lastActivity = useLastActivity(activities);

  const allChanges: FileChange[] = [];
  const seenFiles = new Set<string>();

  activities?.forEach((activity) => {
    activity.artifacts?.forEach((artifact) => {
      if (artifact.changeSet?.gitPatch?.unidiffPatch) {
        const files = parseUnidiffToFiles(
          artifact.changeSet.gitPatch.unidiffPatch,
          artifact.changeSet.source,
          artifact.changeSet.gitPatch.suggestedCommitMessage,
        );
        files.forEach((file) => {
          if (!seenFiles.has(file.filename)) {
            seenFiles.add(file.filename);
            allChanges.push(file);
          }
        });
      }
    });
  });

  // Sort alphabetically by path (like GitHub PR review)
  allChanges.sort((a, b) => a.filename.localeCompare(b.filename));

  const fullDiff = allChanges.map((c) => c.patch).join("\n\n");
  const commitMessage = allChanges.find((c) => c.commitMessage)?.commitMessage;

  // Build markdown with all diffs
  let markdown = "";
  if (commitMessage) {
    markdown += `## Suggested Commit Message\n\n${commitMessage}\n\n---\n\n`;
  }
  markdown += `## ${allChanges.length} Files Changed\n\n`;
  allChanges.forEach((change) => {
    const lineCount = change.displayPatch.split("\n").length;
    markdown += `### ${change.filename} [${lineCount} lines]\n\n\`\`\`diff\n${change.displayPatch}\n\`\`\`\n\n`;
  });

  if (isLoading) {
    return <Detail isLoading navigationTitle={`Code Review: ${props.session.title || props.session.id}`} />;
  }

  if (allChanges.length === 0) {
    return (
      <Detail
        navigationTitle={`Code Review: ${props.session.title || props.session.id}`}
        markdown={`# No Code Changes

This session has no code changes to review.`}
        actions={
          <ActionPanel>
            <Action.Push
              title="Send Message"
              icon={Icon.Message}
              target={
                <QuickMessageForm session={props.session} lastActivity={lastActivity} onMessageSent={revalidate} />
              }
            />
            <Action.OpenInBrowser url={props.session.url} title="Open Session in Browser" />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <Detail
      navigationTitle={`Code Review: ${props.session.title || props.session.id}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.Push
              title="Send Message"
              icon={Icon.Message}
              target={
                <QuickMessageForm session={props.session} lastActivity={lastActivity} onMessageSent={revalidate} />
              }
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard title="Copy All Changes" content={fullDiff} />
            {commitMessage && <Action.CopyToClipboard title="Copy Commit Message" content={commitMessage} />}
          </ActionPanel.Section>
          <ActionPanel.Section title={`Files (${allChanges.length})`}>
            {allChanges.map((file, index) => (
              <Action.Push
                key={`${file.filename}-${index}`}
                title={file.filename}
                icon={Icon.Document}
                target={<FileDetailView file={file} session={props.session} />}
              />
            ))}
          </ActionPanel.Section>
          {prUrl && (
            <ActionPanel.Section title="Pull Request">
              <ApprovePrAction prUrl={prUrl} />
              <MergePrAction prUrl={prUrl} />
              <Action.OpenInBrowser
                icon={{ source: "git-pull-request-arrow.svg", tintColor: Color.PrimaryText }}
                url={prUrl}
                title="Open Pull Request"
              />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.OpenInBrowser url={props.session.url} title="Open Session in Browser" />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

function FollowupInstruction(props: { session: Session; onMessageSent?: () => void }) {
  const { data: activities } = useSessionActivities(props.session.name);

  const lastActivity = useLastActivity(activities);

  return <QuickMessageForm session={props.session} lastActivity={lastActivity} onMessageSent={props.onMessageSent} />;
}

function ApprovePlanAction(props: { session: Session; onApproved?: () => void }) {
  return (
    <Action
      title="Approve Plan"
      icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
      onAction={async () => {
        try {
          await showToast({ style: Toast.Style.Animated, title: "Approving plan" });
          await approvePlan(props.session.name);
          await showToast({ style: Toast.Style.Success, title: "Plan approved" });
          if (props.onApproved) {
            props.onApproved();
          }
        } catch (e) {
          await showFailureToast(e, { title: "Failed to approve plan" });
        }
      }}
    />
  );
}

function DeclinePlanAction(props: { session: Session; mutate: () => Promise<void> }) {
  return (
    <Action.Push
      title="Decline Plan"
      icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
      target={<DeclinePlanForm session={props.session} mutate={props.mutate} />}
    />
  );
}

function DeclinePlanForm(props: { session: Session; mutate: () => Promise<void> }) {
  const { pop } = useNavigation();
  const { handleSubmit, itemProps } = useForm<{ reason: string }>({
    onSubmit: async (values) => {
      try {
        await showToast({ style: Toast.Style.Animated, title: "Declining plan" });
        await sendMessage(props.session.name, `I decline the plan. Reason: ${values.reason.trim()}`);
        await showToast({ style: Toast.Style.Success, title: "Plan declined" });
        await props.mutate();
        pop();
      } catch (e) {
        await showFailureToast(e, { title: "Failed to decline plan" });
      }
    },
    validation: {
      reason: FormValidation.Required,
    },
  });

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Decline Plan" style={Action.Style.Destructive} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Reason" placeholder="Why are you declining this plan?" {...itemProps.reason} />
    </Form>
  );
}

function SessionConversation(props: { session: Session; mutate: () => Promise<void> }) {
  const { data, isLoading } = useSessionActivities(props.session.name);
  const { defaultActivityFilter } = getPreferenceValues<Preferences>();
  const [filter, setFilter] = useState(defaultActivityFilter);

  const filteredData = data?.filter((activity) => {
    if (filter === "messages") {
      return activity.userMessaged || activity.agentMessaged;
    }
    if (filter === "artifacts") {
      return activity.artifacts && activity.artifacts.length > 0;
    }
    if (filter === "hide-progress") {
      return !activity.progressUpdated;
    }
    return true;
  });

  const fullActivityLog = data?.map((a) => getActivityMarkdown(a)).join("\n\n---\n\n") || "";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      navigationTitle={`Activity: ${props.session.title || props.session.id}`}
      actions={
        <ActionPanel>
          <CopyActivityLogAction content={fullActivityLog} />
        </ActionPanel>
      }
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Activities"
          value={filter}
          onChange={(newValue) => setFilter(newValue as Preferences["defaultActivityFilter"])}
        >
          <List.Dropdown.Item title="All Activities" value="all" />
          <List.Dropdown.Section>
            <List.Dropdown.Item title="Conversation Only" value="messages" />
            <List.Dropdown.Item title="Results & Files Only" value="artifacts" />
            <List.Dropdown.Item title="Milestones Only" value="hide-progress" />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      <List.EmptyView title="No Activity Yet" description="This session hasn't started yet" icon={Icon.SpeechBubble} />
      {filteredData?.map((activity) => (
        <List.Item
          key={activity.id}
          title={getActivityTitle(activity)}
          subtitle={format(new Date(activity.createTime), "HH:mm")}
          detail={<List.Item.Detail markdown={getActivityMarkdown(activity)} />}
          actions={(() => {
            const messageContent = activity.userMessaged?.userMessage || activity.agentMessaged?.agentMessage;
            if (!activity.planGenerated && !messageContent) return undefined;

            return (
              <ActionPanel>
                {activity.planGenerated && (
                  <ActionPanel.Section>
                    <Action.Push
                      title="View Plan"
                      icon={Icon.List}
                      target={
                        <PlanDetailView
                          plan={activity.planGenerated.plan}
                          session={props.session}
                          mutate={props.mutate}
                        />
                      }
                    />
                    <CopyPlanMarkdownAction plan={activity.planGenerated.plan} />
                  </ActionPanel.Section>
                )}
                {messageContent && (
                  <ActionPanel.Section>
                    <CopyMessageAction content={messageContent} />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            );
          })()}
        />
      ))}
    </List>
  );
}

function PlanDetailView(props: { plan: Plan; session: Session; mutate: () => Promise<void> }) {
  const { plan, session, mutate } = props;
  const { pop } = useNavigation();

  return (
    <List navigationTitle={`Plan (${plan.steps.length} steps)`} isShowingDetail>
      <List.EmptyView title="No Steps" description="This plan has no steps" icon={Icon.Document} />
      {plan.steps.map((step) => (
        <List.Item
          key={step.id}
          title={step.title}
          accessories={[{ text: `#${(step.index ?? 0) + 1}` }]}
          detail={
            <List.Item.Detail
              markdown={`## ${step.title}\n\n${step.description || "_No description_"}`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Step"
                    text={`${(step.index ?? 0) + 1} of ${plan.steps.length}`}
                  />
                  <List.Item.Detail.Metadata.Label title="ID" text={step.id} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              {session.state === SessionState.AWAITING_PLAN_APPROVAL && (
                <ActionPanel.Section>
                  <ApprovePlanAction
                    session={session}
                    onApproved={() => {
                      mutate();
                      pop();
                    }}
                  />
                  <DeclinePlanAction session={session} mutate={mutate} />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section>
                <CopyIdAction id={step.title} title="Copy Step Title" />
                <CopyStepDescriptionAction content={step.description || ""} />
                <CopyPlanMarkdownAction plan={plan} />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SessionDetail(props: { session: Session }) {
  const { session } = props;

  const prUrl = session.outputs?.find((o) => o.pullRequest)?.pullRequest?.url;

  return (
    <List.Item.Detail
      markdown={`## Prompt\n\n${session.prompt || "_No prompt_"}`}
      metadata={
        <List.Item.Detail.Metadata>
          {session.title && <List.Item.Detail.Metadata.Label title="Title" text={session.title} />}
          <List.Item.Detail.Metadata.Label title="State" text={formatSessionState(session.state)} />
          <List.Item.Detail.Metadata.Separator />
          {prUrl && <List.Item.Detail.Metadata.Link title="Pull Request" text={prUrl} target={prUrl} />}
          <List.Item.Detail.Metadata.Label title="Repository" text={formatRepoName(session.sourceContext?.source)} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function SessionListItem(props: {
  session: Session;
  mutate: () => Promise<void>;
  isShowingDetail: boolean;
  setIsShowingDetail: (value: boolean) => void;
}) {
  const { push } = useNavigation();
  const prUrl = props.session.outputs?.find((o) => o.pullRequest)?.pullRequest?.url;

  const title = formatSessionTitle(props.session, 75);

  return (
    <List.Item
      id={props.session.id}
      key={props.session.id}
      title={title}
      subtitle={props.isShowingDetail ? undefined : formatRepoName(props.session.sourceContext?.source)}
      icon={getStatusIconForSession(props.session)}
      accessories={getSessionAccessories(props.session, {
        hideCreateTime: props.isShowingDetail,
        hideStatus: props.isShowingDetail,
      })}
      detail={<SessionDetail session={props.session} />}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            {props.session.state === SessionState.COMPLETED && (
              <Action.Push
                title="View Code Review"
                icon={Icon.Code}
                target={<CodeReviewPage session={props.session} />}
              />
            )}
            <Action.Push
              icon={Icon.Message}
              title="Send Message"
              target={<FollowupInstruction session={props.session} onMessageSent={props.mutate} />}
              shortcut={
                {
                  macOS: { modifiers: ["cmd", "shift"], key: "n" },
                  windows: { modifiers: ["ctrl", "shift"], key: "n" },
                } as Keyboard.Shortcut
              }
            />
          </ActionPanel.Section>
          {props.session.state === SessionState.AWAITING_PLAN_APPROVAL && (
            <ActionPanel.Section>
              <Action
                title="View Plan"
                icon={Icon.List}
                shortcut={{ modifiers: ["cmd", "shift"], key: "p" }}
                onAction={async () => {
                  try {
                    await showToast({ style: Toast.Style.Animated, title: "Fetching plan" });
                    const activities = await fetchSessionActivities(props.session.name);
                    // Find the latest PlanGenerated activity
                    const planActivity = [...activities].reverse().find((a) => a.planGenerated);
                    if (planActivity?.planGenerated) {
                      push(
                        <PlanDetailView
                          plan={planActivity.planGenerated.plan}
                          session={props.session}
                          mutate={props.mutate}
                        />,
                      );
                    } else {
                      await showToast({ style: Toast.Style.Failure, title: "No plan found" });
                    }
                  } catch (e) {
                    await showFailureToast(e, { title: "Failed to load plan" });
                  }
                }}
              />
              <ApprovePlanAction session={props.session} onApproved={props.mutate} />
              <DeclinePlanAction session={props.session} mutate={props.mutate} />
            </ActionPanel.Section>
          )}
          <ActionPanel.Section>
            <Action.OpenInBrowser url={props.session.url} title="Open in Browser" />
            {prUrl && (
              <Action.OpenInBrowser
                icon={{ source: "git-pull-request-arrow.svg", tintColor: Color.PrimaryText }}
                title="Open Pull Request"
                url={prUrl}
                shortcut={
                  {
                    macOS: { modifiers: ["cmd", "shift"], key: "return" },
                    windows: { modifiers: ["ctrl", "shift"], key: "return" },
                  } as Keyboard.Shortcut
                }
              />
            )}
          </ActionPanel.Section>
          <ActionPanel.Section title="View">
            <Action
              title={props.isShowingDetail ? "Hide Details" : "Show Details"}
              icon={Icon.Sidebar}
              onAction={() => props.setIsShowingDetail(!props.isShowingDetail)}
              shortcut={
                {
                  macOS: { modifiers: ["cmd", "shift"], key: "d" },
                  windows: { modifiers: ["ctrl", "shift"], key: "d" },
                } as Keyboard.Shortcut
              }
            />
            <Action.Push
              icon={Icon.List}
              title="View Activities"
              target={<SessionConversation session={props.session} mutate={props.mutate} />}
              shortcut={
                {
                  macOS: { modifiers: ["cmd", "shift"], key: "v" },
                  windows: { modifiers: ["ctrl", "shift"], key: "v" },
                } as Keyboard.Shortcut
              }
            />
            <Action.Push
              icon={Icon.Code}
              title="View Code Review"
              target={<CodeReviewPage session={props.session} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
            <Action.Push
              icon={Icon.Image}
              title="View Media"
              target={<ViewMedia session={props.session} />}
              shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
            />
            <Action
              title="Summarize Session"
              icon={Icon.Wand}
              onAction={async () => {
                const toast = await showToast({ style: Toast.Style.Animated, title: "Summarizing session" });
                try {
                  const activities = await fetchSessionActivities(props.session.name);
                  if (activities.length > 0) {
                    const content = activities
                      .map((a) => getActivityMarkdown(a, { includeFullArtifacts: false }))
                      .join("\n\n---\n\n");

                    // Raycast AI has a character limit. If it's still too long, we truncate from the beginning
                    // since the most recent activities (at the end) are usually more important for a summary.
                    const MAX_CHARS = 25000;
                    const truncatedContent =
                      content.length > MAX_CHARS
                        ? "... (older activities truncated)\n\n" + content.slice(-MAX_CHARS)
                        : content;

                    const summary = await AI.ask(
                      `Summarize the following session activities of a Jules Agent session. Be concise and highlight the main progress and any issues:\n\n${truncatedContent}`,
                    );
                    push(
                      <Detail
                        navigationTitle="Session Summary"
                        markdown={summary}
                        actions={
                          <ActionPanel>
                            <CopySummaryAction content={summary} />
                          </ActionPanel>
                        }
                      />,
                    );
                    toast.style = Toast.Style.Success;
                    toast.title = "Session summarized";
                  } else {
                    toast.style = Toast.Style.Failure;
                    toast.title = "No activity to summarize";
                  }
                } catch (e) {
                  await showFailureToast(e, { title: "Failed to summarize session" });
                }
              }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section title="Copy">
            <CopyUrlAction url={props.session.url} />
            <CopyIdAction id={props.session.id} />
            <CopyPromptAction prompt={props.session.prompt} />
            {prUrl && <CopyPrUrlAction url={prUrl} />}
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function Command() {
  const { data, isLoading, pagination, mutate } = useSessions();
  const { data: sources, isLoading: isLoadingSources } = useSources();
  const [isShowingDetail, setIsShowingDetail] = useCachedState("isShowingDetail", false);
  const [filterRepo, setFilterRepo] = useCachedState("filterRepo", "all");

  const repositories = Array.from(
    new Set((sources || []).map((source) => formatRepoName(source.name)).filter(Boolean)),
  ).sort();

  const filteredData = data?.filter((session) => {
    if (filterRepo !== "all" && formatRepoName(session.sourceContext?.source) !== filterRepo) return false;
    return true;
  });

  const { today, yesterday, thisWeek, thisMonth, older } = groupSessions(filteredData);

  const dropdownValue = filterRepo !== "all" ? `repo:${filterRepo}` : "all:all";

  return (
    <List
      isLoading={isLoading || isLoadingSources}
      pagination={pagination}
      isShowingDetail={isShowingDetail}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Sessions"
          value={dropdownValue}
          onChange={(newValue) => {
            const [type, value] = newValue.split(":");
            if (type === "repo") {
              setFilterRepo(value);
            } else {
              setFilterRepo("all");
            }
          }}
        >
          <List.Dropdown.Item title="All Sources" value="all:all" />
          <List.Dropdown.Section title="Repository">
            {repositories.map((repo) => (
              <List.Dropdown.Item key={repo} title={repo} value={`repo:${repo}`} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh Sessions"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={mutate}
          />
        </ActionPanel>
      }
    >
      <List.EmptyView
        title="No Sessions Found"
        description="Try changing your filters or launch a new session."
        icon={Icon.EyeDisabled}
      />
      <List.Section title="Today">
        {today.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="Yesterday">
        {yesterday.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="This Week">
        {thisWeek.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="This Month">
        {thisMonth.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
      <List.Section title="Older">
        {older.map((session) => (
          <SessionListItem
            key={session.id}
            session={session}
            mutate={mutate}
            isShowingDetail={isShowingDetail}
            setIsShowingDetail={setIsShowingDetail}
          />
        ))}
      </List.Section>
    </List>
  );
}
