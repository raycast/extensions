import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { listProposals, ConnectionProblem } from "./api/client";
import { useConnection, ConnectionErrorEmptyView } from "./components/connection";
import { relativeDate } from "./utils/formatters";
import type { HubProposal } from "@synap/hub-rest-client";
import { openAppUrl, openUrl } from "./utils/deeplinks";

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

function reviewUrl(podUrl: string, proposalId: string): string {
  return openUrl(podUrl, proposalId);
}

function ProposalItem({ proposal, podUrl }: { proposal: HubProposal; podUrl: string }) {
  const summary = proposalSummary(proposal);
  const url = reviewUrl(podUrl, proposal.id);

  return (
    <List.Item
      icon={{ source: proposalIcon(proposal.action), tintColor: proposalActionColor(proposal.action) }}
      title={summary}
      subtitle={proposal.subjectType}
      accessories={[
        { tag: { value: proposal.action, color: proposalActionColor(proposal.action) } },
        { text: { value: relativeDate(proposal.createdAt), color: Color.SecondaryText } },
      ]}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Review in Synap" url={url} icon={Icon.Window} />
            <Action.OpenInBrowser
              title="Open Proposals in Synap"
              url={openAppUrl("app", "governance")}
              icon={Icon.AppWindowGrid2x2}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action.CopyToClipboard
              title="Copy Review Link"
              content={url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Proposal Id"
              content={proposal.id}
              shortcut={{ modifiers: ["cmd"], key: "." }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}

export default function ReviewProposals() {
  const { connection, isLoading: connLoading, podKey } = useConnection();
  const connected = connection != null;

  const {
    data: proposals,
    isLoading: propsLoading,
    revalidate,
    error,
  } = useCachedPromise(
    // scope: "all" — a review inbox must show every pending proposal the user can
    // see, not just the ones in the pod's default workspace (the bug: proposals
    // living in any other workspace were silently hidden with no error).
    (_pod: string) => listProposals({ status: "pending", limit: 50, scope: "all" }),
    [podKey],
    { execute: connected }
  );

  if (!connLoading && !connected) {
    return (
      <List navigationTitle="Review Pending Proposals">
        <ConnectionErrorEmptyView error={new ConnectionProblem("not-configured", null)} />
      </List>
    );
  }

  const isLoading = connLoading || propsLoading;
  const pending = proposals ?? [];
  const podUrl = connection?.podUrl ?? "";

  return (
    <List
      isLoading={isLoading}
      navigationTitle={
        connection?.podName ? `Review Pending Proposals — ${connection.podName}` : "Review Pending Proposals"
      }
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={revalidate}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
    >
      {error ? (
        <ConnectionErrorEmptyView error={error} onRetry={revalidate} />
      ) : pending.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No pending proposals"
          description="All AI-suggested changes have been reviewed."
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
            </ActionPanel>
          }
        />
      ) : (
        <List.Section title="Pending Review" subtitle={`${pending.length}`}>
          {pending.map((p) => (
            <ProposalItem key={p.id} proposal={p} podUrl={podUrl} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
