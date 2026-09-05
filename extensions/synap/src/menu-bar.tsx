import {
  Clipboard,
  Color,
  Icon,
  MenuBarExtra,
  openExtensionPreferences,
  open,
  launchCommand,
  LaunchType,
  showToast,
  Toast,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { searchEntities, connectionFixCommand, listProposals, reviewProposal } from "./api/client";
import { RAYCAST_CONNECT_DEEPLINK } from "./utils/preferences";
import { useConnection, describeConnectionError } from "./components/connection";
import { openAppUrl, openUrl } from "./utils/deeplinks";
import { relativeDate } from "./utils/formatters";
import { getFocus, clearFocus } from "./utils/focus";
import type { HubProposal } from "@synap/hub-rest-client";

// Mirrors review-proposals.tsx's labeling (summary/icon/color) — kept lean,
// not re-exported since that file is a read-only reference for this change.
function proposalIcon(action: HubProposal["action"]): Icon {
  switch (action) {
    case "create":
      return Icon.Plus;
    case "update":
      return Icon.Pencil;
    case "delete":
      return Icon.Trash;
    default:
      return Icon.Document;
  }
}

function proposalActionColor(action: HubProposal["action"]): Color {
  switch (action) {
    case "create":
      return Color.Green;
    case "update":
      return Color.Blue;
    case "delete":
      return Color.Red;
    default:
      return Color.SecondaryText;
  }
}

function proposalSummary(proposal: HubProposal): string {
  const data = proposal.data;
  if (typeof data.summary === "string") return data.summary;
  if (typeof data.title === "string") return data.title;
  if (typeof data.name === "string") return data.name;
  return `${proposal.action} ${proposal.subjectType}`;
}

// The canonical review door — same URL review-proposals.tsx uses.
function reviewUrl(podUrl: string, proposalId: string): string {
  return openUrl(podUrl, proposalId);
}

function useMenuBarData(enabled: boolean, podKey: string) {
  const {
    data: tasks,
    isLoading: tasksLoading,
    error,
  } = useCachedPromise(
    (_pod: string) => searchEntities("", { profileSlug: "task", limit: 20, scope: "all" }),
    [podKey],
    { keepPreviousData: true, execute: enabled }
  );

  const {
    data: proposals,
    isLoading: proposalsLoading,
    revalidate: revalidateProposals,
  } = useCachedPromise((_pod: string) => listProposals({ status: "pending", limit: 20, scope: "all" }), [podKey], {
    keepPreviousData: true,
    execute: enabled,
  });

  const {
    data: focus,
    isLoading: focusLoading,
    revalidate: revalidateFocus,
  } = useCachedPromise(() => getFocus(), [], { execute: enabled });

  const pendingTasks = (tasks ?? []).filter((t) => t.status === "todo" || t.status === "in-progress");
  const overdueTasks = pendingTasks.filter((t) => t.dueDate && new Date(t.dueDate) < new Date());
  const pendingProposals = proposals ?? [];

  return {
    pendingTasks,
    overdueTasks,
    pendingProposals,
    revalidateProposals,
    focus: focus ?? null,
    revalidateFocus,
    isLoading: tasksLoading || proposalsLoading || focusLoading,
    error,
  };
}

async function handleReview(proposal: HubProposal, decision: "approved" | "rejected", onDone: () => void) {
  try {
    await reviewProposal(proposal.id, decision);
    await showToast({
      style: Toast.Style.Success,
      title: decision === "approved" ? "Proposal approved" : "Proposal rejected",
      message: proposalSummary(proposal),
    });
    onDone();
  } catch (e) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to ${decision === "approved" ? "approve" : "reject"} proposal`,
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

async function openSwitchPod() {
  try {
    await launchCommand({ name: "switch-pod", type: LaunchType.UserInitiated });
  } catch {
    await open(RAYCAST_CONNECT_DEEPLINK);
  }
}

export default function MenuBar() {
  const { connection, isLoading: connLoading, podKey } = useConnection();
  const configured = connection != null;
  const {
    pendingTasks,
    overdueTasks,
    pendingProposals,
    revalidateProposals,
    focus,
    revalidateFocus,
    isLoading,
    error,
  } = useMenuBarData(configured, podKey);

  if (connLoading) {
    return <MenuBarExtra icon={Icon.Circle} title="" isLoading />;
  }

  if (!configured) {
    return (
      <MenuBarExtra icon={Icon.ExclamationMark} title="Synap">
        <MenuBarExtra.Item
          title="Connect to Synap Pod"
          icon={Icon.Link}
          onAction={() => open(RAYCAST_CONNECT_DEEPLINK)}
        />
        <MenuBarExtra.Item title="Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
      </MenuBarExtra>
    );
  }

  // Connection is configured but calls fail — say so and offer the way out,
  // never a green checkmark over stale data.
  if (error) {
    const { title, description } = describeConnectionError(error);
    const fixCommand = connectionFixCommand(connection);
    return (
      <MenuBarExtra icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} title="Synap">
        <MenuBarExtra.Section title={connection.podName ? `Pod: ${connection.podName}` : connection.podUrl}>
          <MenuBarExtra.Item title={title} subtitle={description} icon={Icon.Warning} />
        </MenuBarExtra.Section>
        <MenuBarExtra.Section>
          <MenuBarExtra.Item title="Switch Pod…" icon={Icon.Switch} onAction={openSwitchPod} />
          {fixCommand && (
            <MenuBarExtra.Item
              title="Copy Fix Command"
              icon={Icon.Terminal}
              onAction={() => Clipboard.copy(fixCommand)}
            />
          )}
          <MenuBarExtra.Item
            title="Open Connect to Synap Pod"
            icon={Icon.Link}
            onAction={() => open(RAYCAST_CONNECT_DEEPLINK)}
          />
        </MenuBarExtra.Section>
      </MenuBarExtra>
    );
  }

  // Proposals are the ambient governance surface — they lead the badge/title;
  // overdue tasks are the fallback signal when nothing needs review.
  const proposalCount = pendingProposals.length;
  const overdueCount = overdueTasks.length;
  const title = proposalCount > 0 ? String(proposalCount) : overdueCount > 0 ? String(overdueCount) : undefined;
  const icon =
    proposalCount > 0
      ? { source: Icon.Megaphone, tintColor: Color.Yellow }
      : overdueCount > 0
        ? { source: Icon.Bell, tintColor: Color.Red }
        : Icon.CheckCircle;
  const podUrl = connection.podUrl ?? "";

  return (
    <MenuBarExtra icon={icon} title={title} isLoading={isLoading}>
      <MenuBarExtra.Section title={`Focus: ${focus ? focus.name : "Pod-wide"}`}>
        {focus && (
          <MenuBarExtra.Item
            title="Clear Focus"
            icon={Icon.XMarkCircle}
            onAction={async () => {
              await clearFocus();
              revalidateFocus();
            }}
          />
        )}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section title={`Proposals (${proposalCount})`}>
        {pendingProposals.slice(0, 10).map((proposal) => (
          <MenuBarExtra.Submenu
            key={proposal.id}
            title={`${proposalSummary(proposal)} (${proposal.subjectType})`}
            icon={{ source: proposalIcon(proposal.action), tintColor: proposalActionColor(proposal.action) }}
          >
            <MenuBarExtra.Item
              title="Review…"
              icon={Icon.Window}
              onAction={() => open(reviewUrl(podUrl, proposal.id))}
            />
            <MenuBarExtra.Item
              title="Approve"
              icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
              onAction={() => handleReview(proposal, "approved", revalidateProposals)}
            />
            <MenuBarExtra.Item
              title="Reject"
              icon={{ source: Icon.XMarkCircle, tintColor: Color.Red }}
              onAction={() => handleReview(proposal, "rejected", revalidateProposals)}
            />
          </MenuBarExtra.Submenu>
        ))}
        {proposalCount === 0 && <MenuBarExtra.Item title="No pending proposals" />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section
        title={`Tasks (${pendingTasks.length})${connection.podName ? ` — ${connection.podName}` : ""}`}
      >
        {pendingTasks.slice(0, 10).map((task) => (
          <MenuBarExtra.Item
            key={task.id}
            title={task.title}
            subtitle={task.dueDate ? relativeDate(task.dueDate) : undefined}
            icon={task.status === "in-progress" ? { source: Icon.Dot, tintColor: Color.Blue } : Icon.Circle}
            onAction={() => open(openAppUrl("entity", task.id))}
          />
        ))}
        {pendingTasks.length === 0 && <MenuBarExtra.Item title="No pending tasks" />}
      </MenuBarExtra.Section>
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title="Open Synap"
          icon={Icon.Window}
          onAction={() => open(openAppUrl("app", "dashboard"))}
        />
        <MenuBarExtra.Item title="Switch Pod…" icon={Icon.Switch} onAction={openSwitchPod} />
        <MenuBarExtra.Item
          title="Open Pod in Browser"
          icon={Icon.Globe}
          onAction={() => {
            if (connection.podUrl) open(connection.podUrl);
          }}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
