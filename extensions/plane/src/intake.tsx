import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedState } from "@raycast/utils";
import { Project, PriorityEnum } from "@makeplane/plane-node-sdk";
import { addDays, format } from "date-fns";
import { useState } from "react";
import AuthorizedView from "./components/AuthorizedView";
import ErrorEmptyView from "./components/ErrorEmptyView";
import ProjectDropdown from "./components/ProjectDropdown";
import WorkItemDetail from "./components/WorkItemDetail";
import ChangeWorkspaceAction from "./components/actions/ChangeWorkspaceAction";
import { useMemberProjects } from "./hooks/useProjects";
import { useIntakeItems } from "./hooks/useIntake";
import { getIntakeStatusLabel, IntakeUpdate, updateIntakeItem } from "./api/intake";
import { getWorkItemByIdentifier } from "./api/work-items";
import { IntakeStatus, RawIntakeItem } from "./api/types";
import { getIntakeUrl, getProjectUrl, getWorkItemUrlWithIdentifier } from "./helpers/work-items";
import { checkReferenceWorkspace, formatWorkItemIdentifier, parseWorkItemIdentifier } from "./helpers/identifiers";
import { describePlaneError } from "./helpers/errors";
import { priorityToIcon } from "./helpers/icons";
import { parseHtmlToMarkdown } from "./helpers/parser";
import { planeClient } from "./api/auth";

const OPEN_STATUSES: number[] = [IntakeStatus.Pending, IntakeStatus.Snoozed];

const STATUS_ICONS: Record<number, { source: Icon; tintColor: Color }> = {
  [IntakeStatus.Pending]: { source: Icon.Clock, tintColor: Color.Orange },
  [IntakeStatus.Snoozed]: { source: Icon.Moon, tintColor: Color.Purple },
  [IntakeStatus.Accepted]: { source: Icon.CheckCircle, tintColor: Color.Green },
  [IntakeStatus.Rejected]: { source: Icon.XMarkCircle, tintColor: Color.Red },
  [IntakeStatus.Duplicate]: { source: Icon.Duplicate, tintColor: Color.SecondaryText },
};

type IntakeMutate = (
  request: Promise<unknown>,
  options: { optimisticUpdate: (data: RawIntakeItem[] | undefined) => RawIntakeItem[] },
) => Promise<unknown>;

async function applyIntakeUpdate({
  project,
  item,
  update,
  label,
  mutate,
}: {
  project: Project;
  item: RawIntakeItem;
  update: IntakeUpdate;
  label: string;
  mutate: IntakeMutate;
}) {
  const workItemId = item.issue ?? item.issue_detail?.id;
  if (!workItemId || !project.id) return;
  const toast = await showToast({ style: Toast.Style.Animated, title: `${label}…` });
  try {
    await mutate(updateIntakeItem({ projectId: project.id, workItemId, update }), {
      optimisticUpdate: (data) => (data ?? []).map((row) => (row.id === item.id ? { ...row, ...update } : row)),
    });
    toast.style = Toast.Style.Success;
    toast.title = label;
    toast.message = item.issue_detail?.name;
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = `${label} failed`;
    toast.message = describePlaneError(error).message;
  }
}

function MarkDuplicateForm({ project, item, mutate }: { project: Project; item: RawIntakeItem; mutate: IntakeMutate }) {
  const { pop } = useNavigation();
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(values: { identifier: string }) {
    const parsed = parseWorkItemIdentifier(values.identifier);
    if (!parsed) {
      setError("Enter an ID such as ENG-123");
      return;
    }
    const problem = checkReferenceWorkspace(parsed, planeClient?.workspaceSlug);
    if (problem) {
      setError(problem);
      return;
    }
    try {
      const original = await getWorkItemByIdentifier(parsed.projectIdentifier, parsed.sequenceId);
      if (!original.id) throw new Error("Work item not found");
      await applyIntakeUpdate({
        project,
        item,
        update: { status: IntakeStatus.Duplicate, duplicate_to: original.id },
        label: `Marked as duplicate of ${parsed.projectIdentifier}-${parsed.sequenceId}`,
        mutate,
      });
      pop();
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Work item not found",
        message: describePlaneError(err).message,
      });
    }
  }

  return (
    <Form
      navigationTitle="Mark as Duplicate"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Mark as Duplicate" icon={Icon.Duplicate} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Description text={`"${item.issue_detail?.name ?? "Intake item"}" duplicates…`} />
      <Form.TextField
        id="identifier"
        title="Original Work Item"
        placeholder={`${project.identifier}-123`}
        error={error}
        onChange={() => setError(undefined)}
      />
    </Form>
  );
}

function IntakeItemRow({
  item,
  project,
  mutate,
  extraActions,
}: {
  item: RawIntakeItem;
  project: Project;
  mutate: IntakeMutate;
  extraActions: React.ReactNode;
}) {
  const slug = planeClient?.workspaceSlug ?? "";
  const detail = item.issue_detail;
  const identifier = formatWorkItemIdentifier(project.identifier, detail?.sequence_id);
  const status = item.status ?? IntakeStatus.Pending;
  const workItemId = item.issue ?? detail?.id;
  const accessories: List.Item.Accessory[] = [];
  if (detail?.priority && detail.priority !== PriorityEnum.None) {
    accessories.push({ icon: priorityToIcon(detail.priority), tooltip: `Priority: ${detail.priority}` });
  }
  if (status === IntakeStatus.Snoozed && item.snoozed_till) {
    accessories.push({ icon: Icon.Moon, text: format(new Date(item.snoozed_till), "MMM d"), tooltip: "Snoozed until" });
  }
  accessories.push({ tag: getIntakeStatusLabel(status) });
  if (item.created_at) accessories.push({ date: new Date(item.created_at), tooltip: "Submitted" });

  const run = (update: IntakeUpdate, label: string) => applyIntakeUpdate({ project, item, update, label, mutate });

  return (
    <List.Item
      icon={STATUS_ICONS[status] ?? Icon.Tray}
      title={detail?.name ?? "Untitled"}
      subtitle={identifier}
      keywords={[identifier, item.source ?? ""]}
      accessories={accessories}
      actions={
        <ActionPanel title={identifier}>
          <ActionPanel.Section>
            <Action
              title="Accept"
              icon={Icon.CheckCircle}
              shortcut={{ modifiers: ["cmd", "shift"], key: "y" }}
              onAction={() => run({ status: IntakeStatus.Accepted }, "Accepted")}
            />
            <Action
              title="Decline"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              shortcut={{ modifiers: ["cmd", "shift"], key: "x" }}
              onAction={async () => {
                const confirmed = await confirmAlert({
                  title: "Decline intake item?",
                  message: detail?.name,
                  primaryAction: { title: "Decline", style: Alert.ActionStyle.Destructive },
                });
                if (confirmed) await run({ status: IntakeStatus.Rejected }, "Declined");
              }}
            />
            <ActionPanel.Submenu title="Snooze" icon={Icon.Moon} shortcut={{ modifiers: ["cmd", "shift"], key: "z" }}>
              {[
                { title: "Tomorrow", days: 1 },
                { title: "In 3 Days", days: 3 },
                { title: "In 1 Week", days: 7 },
                { title: "In 2 Weeks", days: 14 },
              ].map((option) => (
                <Action
                  key={option.days}
                  title={option.title}
                  onAction={() =>
                    run(
                      { status: IntakeStatus.Snoozed, snoozed_till: addDays(new Date(), option.days).toISOString() },
                      `Snoozed until ${format(addDays(new Date(), option.days), "MMM d")}`,
                    )
                  }
                />
              ))}
            </ActionPanel.Submenu>
            <Action.Push
              title="Mark as Duplicate"
              icon={Icon.Duplicate}
              shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
              target={<MarkDuplicateForm project={project} item={item} mutate={mutate} />}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {workItemId && project.id ? (
              <Action.Push
                title="Open Work Item"
                icon={Icon.Sidebar}
                target={
                  <WorkItemDetail
                    slug={slug}
                    projectId={project.id}
                    workItemId={workItemId}
                    mutateWorkItemList={() => {}}
                  />
                }
              />
            ) : null}
            {project.id ? (
              <Action.OpenInBrowser title="Open Intake in Browser" url={getIntakeUrl(slug, project.id)} />
            ) : null}
            <Action.CopyToClipboard
              title="Copy Identifier"
              content={identifier}
              shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
            />
            <Action.CopyToClipboard
              title="Copy URL"
              content={getWorkItemUrlWithIdentifier(slug, identifier)}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            {extraActions}
            <ChangeWorkspaceAction />
          </ActionPanel.Section>
        </ActionPanel>
      }
      detail={
        <List.Item.Detail
          markdown={`# ${detail?.name ?? ""}\n\n${parseHtmlToMarkdown(detail?.description_html ?? "")}`}
        />
      }
    />
  );
}

function Intake() {
  const {
    projects,
    isLoading: isLoadingProjects,
    error: projectsError,
    revalidate: revalidateProjects,
  } = useMemberProjects();
  const [projectId, setProjectId] = useState("");
  const [showClosed, setShowClosed] = useCachedState<boolean>("show-closed:intake", false);
  const [showDetail, setShowDetail] = useCachedState<boolean>("show-detail:intake", false);
  const project = projects.find((item) => item.id === projectId) ?? projects[0];
  const intakeEnabled = project?.intakeView !== false;
  const { data, isLoading, error, revalidate, mutate, pagination } = useIntakeItems(project?.id, {
    execute: !!project?.id && intakeEnabled,
  });
  const items = intakeEnabled ? (data ?? []) : [];
  const visible = items.filter((item) => showClosed || OPEN_STATUSES.includes(item.status ?? IntakeStatus.Pending));
  const pending = visible.filter((item) => (item.status ?? IntakeStatus.Pending) === IntakeStatus.Pending);
  const others = visible.filter((item) => (item.status ?? IntakeStatus.Pending) !== IntakeStatus.Pending);
  const listError = projectsError ?? error;
  const slug = planeClient?.workspaceSlug ?? "";

  const extraActions = (
    <>
      <Action
        title={showDetail ? "Hide Details" : "Show Details"}
        icon={Icon.Sidebar}
        shortcut={{ modifiers: ["cmd"], key: "d" }}
        onAction={() => setShowDetail(!showDetail)}
      />
      <Action
        title={showClosed ? "Hide Accepted, Declined and Duplicates" : "Show Accepted, Declined and Duplicates"}
        icon={showClosed ? Icon.EyeDisabled : Icon.Eye}
        shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
        onAction={() => setShowClosed(!showClosed)}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        shortcut={{ modifiers: ["cmd"], key: "r" }}
        onAction={revalidate}
      />
    </>
  );

  const emptyView = () => {
    if (listError && items.length === 0) {
      return (
        <ErrorEmptyView
          error={listError}
          onRetry={() => {
            revalidateProjects();
            revalidate();
          }}
        />
      );
    }
    if (project && !intakeEnabled) {
      return (
        <List.EmptyView
          icon={Icon.Tray}
          title="Intake is disabled for this project"
          description={`Turn on Intake in ${project.name}'s project settings (Features) to triage requests here.`}
          actions={
            <ActionPanel>
              {project.id ? (
                <Action.OpenInBrowser title="Open Project in Browser" url={getProjectUrl(slug, project.id)} />
              ) : null}
              <ChangeWorkspaceAction />
            </ActionPanel>
          }
        />
      );
    }
    return (
      <List.EmptyView
        icon={Icon.Tray}
        title={project ? "Intake is empty" : "No projects"}
        description={project ? "No pending intake items. Nice." : undefined}
        actions={<ActionPanel>{extraActions}</ActionPanel>}
      />
    );
  };

  return (
    <List
      isLoading={isLoadingProjects || isLoading}
      isShowingDetail={showDetail && visible.length > 0}
      pagination={pagination}
      searchBarPlaceholder="Filter intake"
      searchBarAccessory={<ProjectDropdown projects={projects} onChange={setProjectId} />}
    >
      {emptyView()}
      {project ? (
        <>
          <List.Section title="Pending" subtitle={String(pending.length)}>
            {pending.map((item) => (
              <IntakeItemRow key={item.id} item={item} project={project} mutate={mutate} extraActions={extraActions} />
            ))}
          </List.Section>
          <List.Section title={showClosed ? "Snoozed and Processed" : "Snoozed"}>
            {others.map((item) => (
              <IntakeItemRow key={item.id} item={item} project={project} mutate={mutate} extraActions={extraActions} />
            ))}
          </List.Section>
        </>
      ) : null}
    </List>
  );
}

export default function Command() {
  return (
    <AuthorizedView>
      <Intake />
    </AuthorizedView>
  );
}
