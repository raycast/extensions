import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Form,
  Icon,
  List,
  open,
  showToast,
  Toast,
  useNavigation,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { captureStructure, submitCaptureGraph, HubApiError } from "../api/client";
import type { CaptureProposal, CaptureRelation } from "../api/client";
import type { SynapConnection } from "../utils/preferences";

export interface CaptureDraft {
  text: string;
  url?: string;
  sourceLabel: string;
  placeholder: string;
}

interface CaptureFlowProps {
  connection: SynapConnection;
  draft: CaptureDraft;
}

/**
 * The single native Raycast capture journey. Entry points only resolve their
 * source material; planning, follow-up, review, raw fallback and submission
 * live here so every capture has identical governance and failure semantics.
 */
export function CaptureFlow({ connection, draft }: CaptureFlowProps) {
  const { push } = useNavigation();

  const startStructure = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      void showToast({ style: Toast.Style.Failure, title: "Nothing to capture" });
      return;
    }
    push(<StructuringView connection={connection} text={trimmed} url={draft.url} sourceLabel={draft.sourceLabel} />);
  };

  const startRawCapture = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) {
      void showToast({ style: Toast.Style.Failure, title: "Nothing to capture" });
      return;
    }
    push(<RawCaptureReview text={trimmed} url={draft.url} sourceLabel={draft.sourceLabel} />);
  };

  return (
    <Form
      navigationTitle="Capture to Synap"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Review AI Structure"
            icon={Icon.Stars}
            onSubmit={(values: { text: string }) => startStructure(values.text)}
          />
          <Action.SubmitForm
            title="Queue Raw Capture for Review"
            icon={Icon.Document}
            shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
            onSubmit={(values: { text: string }) => startRawCapture(values.text)}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea id="text" title="Capture" placeholder={draft.placeholder} autoFocus defaultValue={draft.text} />
      <Form.Description title="Source" text={draft.sourceLabel} />
      <Form.Description title="Destination" text="Pod-wide intake; Synap routes only a plan that needs a workspace." />
      <Form.Description text="Use capture for raw material. AI suggests a reviewable graph; raw capture keeps the original text without AI structuring." />
    </Form>
  );
}

function StructuringView({
  connection,
  text,
  url,
  sourceLabel,
}: {
  connection: SynapConnection;
  text: string;
  url?: string;
  sourceLabel: string;
}) {
  const { push, pop } = useNavigation();

  useEffect(() => {
    void (async () => {
      try {
        // Start pod-wide. A workspace is used only when the capture service
        // explicitly resolves one as part of the returned review plan.
        const result = await captureStructure({ text, url });

        // CONFIRM MODE (human key): when this pod holds the plan for us, the
        // structure door already PERSISTED it as one pending composite proposal
        // and returns `awaiting_confirmation` instead of ephemeral proposals.
        // The confirm gesture is approving that existing proposal in Synap — NOT
        // a second submit. (An agent key gets the ephemeral plan below unchanged;
        // degraded / follow-up / empty plans are never persisted, so they still
        // flow through the branches after this.)
        const persisted = result as unknown as {
          status?: string;
          proposalId?: string;
          reviewUrl?: string;
          summary?: string;
          entityCount?: number;
          relationCount?: number;
          projectCandidate?: { name: string };
        };
        if (persisted.status === "awaiting_confirmation") {
          push(<PersistedPlanReview connection={connection} plan={persisted} />);
          return;
        }

        const committedWorkspaceId = result.targetWorkspaceId ?? undefined;
        const targetProjectId = result.targetProjectId ?? undefined;
        const routingReason = result.targetWorkspaceReason ?? undefined;

        if (result.degraded) {
          push(
            <RawCaptureReview
              text={text}
              url={url}
              sourceLabel={sourceLabel}
              workspaceId={committedWorkspaceId}
              degraded
            />
          );
          return;
        }

        if (result.followUp) {
          push(
            <FollowUpView
              connection={connection}
              text={text}
              url={url}
              sourceLabel={sourceLabel}
              followUp={result.followUp}
              proposals={result.proposals}
              relations={result.relations}
              workspaceId={committedWorkspaceId}
              projectId={targetProjectId}
              routingReason={routingReason}
            />
          );
          return;
        }

        if (!result.proposals.some((proposal) => proposal.action !== "dismiss")) {
          push(
            <RawCaptureReview
              text={text}
              url={url}
              sourceLabel={sourceLabel}
              workspaceId={committedWorkspaceId}
              unstructured
            />
          );
          return;
        }

        push(
          <ReviewView
            connection={connection}
            proposals={result.proposals}
            relations={result.relations}
            workspaceId={committedWorkspaceId}
            projectId={targetProjectId}
            routingReason={routingReason}
            rawSource={{ rawText: text, sourceUrl: url, label: sourceLabel }}
          />
        );
      } catch (error) {
        const reconnect = error instanceof HubApiError && (error.isUnauthorized || error.isForbidden);
        await showToast({
          style: Toast.Style.Failure,
          title: reconnect ? "Reconnect to Synap" : "Analysis failed",
          message: reconnect
            ? "Pod credentials are invalid or expired. Run Connect to Synap Pod and retry."
            : error instanceof Error
              ? error.message
              : "Synap Pod is unreachable. Nothing was queued.",
        });
        pop();
      }
    })();
  }, []);

  return (
    <List isLoading>
      <List.EmptyView title="Reviewing your capture…" description="Synap is preparing a proposal" icon={Icon.Stars} />
    </List>
  );
}

/**
 * Confirm-mode terminal: the pod already persisted this capture as one pending
 * composite proposal (`awaiting_confirmation`). Nothing to re-submit — the
 * confirm gesture is approving it in Synap. If it is never approved it remains a
 * visible uncommitted proposal, not a silent loss.
 */
function PersistedPlanReview({
  connection,
  plan,
}: {
  connection: SynapConnection;
  plan: {
    proposalId?: string;
    reviewUrl?: string;
    summary?: string;
    entityCount?: number;
    relationCount?: number;
    projectCandidate?: { name: string };
  };
}) {
  const { pop } = useNavigation();
  const entityCount = plan.entityCount ?? 0;
  const relationCount = plan.relationCount ?? 0;
  const markdown = [
    `# Ready to review`,
    plan.summary ? `\n${plan.summary}` : "",
    `\nSynap prepared **${entityCount} entit${entityCount === 1 ? "y" : "ies"}**${relationCount ? ` and **${relationCount} link${relationCount === 1 ? "" : "s"}**` : ""} and queued them as one pending proposal. Nothing is applied until you approve it.`,
    plan.projectCandidate ? `\n**Suggested project:** ${plan.projectCandidate.name}` : "",
    `\n**Pod:** ${connection.podName ?? connection.podUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <Detail
      navigationTitle="Review Capture"
      markdown={markdown}
      actions={
        <ActionPanel>
          {plan.reviewUrl && (
            <Action
              title="Open Review to Approve"
              icon={Icon.Upload}
              onAction={() => {
                open(plan.reviewUrl!);
                popToRoot();
              }}
            />
          )}
          <Action title="Done" icon={Icon.Check} onAction={() => popToRoot()} />
          <Action title="Cancel" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}

function FollowUpView({
  connection,
  text,
  url,
  sourceLabel,
  followUp,
  proposals,
  relations,
  workspaceId,
  projectId,
  routingReason,
}: {
  connection: SynapConnection;
  text: string;
  url?: string;
  sourceLabel: string;
  followUp: string | { question?: string };
  proposals: CaptureProposal[];
  relations: CaptureRelation[];
  workspaceId?: string;
  projectId?: string;
  routingReason?: string;
}) {
  const { push, pop } = useNavigation();
  const question = typeof followUp === "string" ? followUp : (followUp.question ?? "");

  return (
    <Form
      navigationTitle="One detail before review"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Continue Review"
            icon={Icon.ArrowRight}
            onSubmit={(values: { answer: string }) =>
              push(
                <StructuringView
                  connection={connection}
                  text={`${text}\n\nAnswer: ${values.answer.trim()}`}
                  url={url}
                  sourceLabel={sourceLabel}
                />
              )
            }
          />
          {proposals.length > 0 && (
            <Action
              title="Review Current Proposal"
              icon={Icon.Forward}
              shortcut={{ modifiers: ["cmd", "shift"], key: "return" }}
              onAction={() =>
                push(
                  <ReviewView
                    connection={connection}
                    proposals={proposals}
                    relations={relations}
                    workspaceId={workspaceId}
                    projectId={projectId}
                    routingReason={routingReason}
                    rawSource={{ rawText: text, sourceUrl: url, label: sourceLabel }}
                  />
                )
              }
            />
          )}
          <Action title="Cancel Capture" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Synap asks"
        text={question || "Synap needs one more detail to prepare a useful proposal."}
      />
      <Form.TextArea id="answer" title="Your answer" placeholder="Add the missing context…" autoFocus />
    </Form>
  );
}

function ReviewView({
  connection,
  proposals,
  relations,
  workspaceId,
  projectId,
  routingReason,
  rawSource,
}: {
  connection: SynapConnection;
  proposals: CaptureProposal[];
  relations: CaptureRelation[];
  workspaceId?: string;
  projectId?: string;
  routingReason?: string;
  rawSource?: { rawText?: string; sourceUrl?: string; label?: string };
}) {
  const [selected, setSelected] = useState(
    () => new Set(proposals.filter((p) => p.action !== "dismiss").map((p) => p.tempId))
  );

  const toggle = (tempId: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(tempId)) next.delete(tempId);
      else next.add(tempId);
      return next;
    });
  };

  const submit = async () => {
    const included = proposals.filter((proposal) => selected.has(proposal.tempId));
    if (included.length === 0) {
      await showToast({ style: Toast.Style.Failure, title: "Nothing selected" });
      return;
    }

    await showToast({ style: Toast.Style.Animated, title: "Queuing for review…" });
    try {
      const result = await submitCaptureGraph({
        workspaceId,
        projectId,
        source: "raycast",
        rawSource,
        entities: included.map((proposal) => ({
          ref: proposal.tempId,
          profileSlug: proposal.profileSlug,
          title: proposal.title,
          description: proposal.description,
          content: proposal.content,
          properties: proposal.properties,
          existingEntityId: proposal.linkedEntityId,
          facets: proposal.facets?.map((facet) => ({
            profileSlug: facet.profileSlug,
            status: facet.status,
            properties: facet.properties,
            contextRef: facet.contextTempId,
          })),
        })),
        relations: relations
          .filter((relation) => selected.has(relation.sourceTempId) && selected.has(relation.targetTempId))
          .map((relation) => ({
            sourceRef: relation.sourceTempId,
            targetRef: relation.targetTempId,
            type: relation.relationType,
          })),
      });
      await showToast({
        style: Toast.Style.Success,
        title: result.summary || `Queued ${result.entityCount} change${result.entityCount === 1 ? "" : "s"} for review`,
        message: "Nothing has been applied yet.",
        ...(result.reviewUrl
          ? {
              primaryAction: {
                title: "Open review",
                onAction: () => open(result.reviewUrl!),
              },
            }
          : {}),
      });
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not queue capture",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const selectedRelations = relations.filter(
    (relation) => selected.has(relation.sourceTempId) && selected.has(relation.targetTempId)
  );
  const titleFor = (ref: string) => proposals.find((proposal) => proposal.tempId === ref)?.title ?? ref;
  const destination = workspaceId ? `Routed by Synap to workspace ${workspaceId}` : "Pod-wide capture";

  return (
    <List navigationTitle="Review Capture">
      <List.Section title="Destination">
        <List.Item icon={Icon.House} title={connection.podName ?? connection.podUrl} subtitle={destination} />
        {projectId && <List.Item icon={Icon.Folder} title="Target project" subtitle={projectId} />}
        {routingReason && <List.Item icon={Icon.Compass} title="Routing basis" subtitle={routingReason} />}
      </List.Section>
      <List.Section title="Proposed changes">
        {proposals.map((proposal) => (
          <List.Item
            key={proposal.tempId}
            icon={selected.has(proposal.tempId) ? { source: Icon.CheckCircle, tintColor: Color.Green } : Icon.Circle}
            title={proposal.title}
            subtitle={
              proposal.action === "link" && proposal.linkedEntityTitle
                ? `Link to ${proposal.linkedEntityTitle}`
                : proposal.description
            }
            accessories={[
              { text: proposal.profileSlug },
              ...(proposal.properties && Object.keys(proposal.properties).length > 0
                ? [{ text: `${Object.keys(proposal.properties).length} fields` }]
                : []),
              ...(proposal.facets?.length ? [{ text: `${proposal.facets.length} roles` }] : []),
              { text: `${Math.round(proposal.confidence * 100)}%`, tooltip: "AI confidence" },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="Inspect Proposed Data"
                  icon={Icon.Eye}
                  target={<CaptureProposalDetail proposal={proposal} />}
                />
                <Action
                  title={selected.has(proposal.tempId) ? "Exclude from Review" : "Include in Review"}
                  icon={Icon.CheckCircle}
                  onAction={() => toggle(proposal.tempId)}
                />
                <Action
                  title={`Queue ${selected.size} Change${selected.size === 1 ? "" : "s"} for Review`}
                  icon={Icon.Upload}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                  onAction={submit}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      {selectedRelations.length > 0 && (
        <List.Section title={`Relationships (${selectedRelations.length})`}>
          {selectedRelations.map((relation) => (
            <List.Item
              key={`${relation.sourceTempId}-${relation.relationType}-${relation.targetTempId}`}
              icon={Icon.ArrowRight}
              title={`${titleFor(relation.sourceTempId)} → ${titleFor(relation.targetTempId)}`}
              subtitle={relation.relationType}
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}

function CaptureProposalDetail({ proposal }: { proposal: CaptureProposal }) {
  const facets = proposal.facets?.map((facet) => ({
    role: facet.profileSlug,
    ...(facet.status ? { status: facet.status } : {}),
    ...(facet.properties && Object.keys(facet.properties).length > 0 ? { properties: facet.properties } : {}),
  }));
  const fields = proposal.properties && Object.keys(proposal.properties).length > 0 ? proposal.properties : undefined;
  const details = [
    `# ${proposal.title}`,
    proposal.description ? `\n${proposal.description}` : "",
    `\n**Type:** ${proposal.profileSlug}`,
    `\n**Action:** ${proposal.action}`,
    `\n**Confidence:** ${Math.round(proposal.confidence * 100)}%`,
    proposal.linkedEntityTitle ? `\n**Existing entity:** ${proposal.linkedEntityTitle}` : "",
    proposal.content ? `\n## Content\n\n${proposal.content}` : "",
    fields ? `\n## Proposed fields\n\n\`\`\`json\n${JSON.stringify(fields, null, 2)}\n\`\`\`` : "",
    facets?.length ? `\n## Proposed roles\n\n\`\`\`json\n${JSON.stringify(facets, null, 2)}\n\`\`\`` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return <Detail navigationTitle="Proposed Data" markdown={details} />;
}

function RawCaptureReview({
  text,
  url,
  sourceLabel,
  workspaceId,
  degraded = false,
  unstructured = false,
}: {
  text: string;
  url?: string;
  sourceLabel: string;
  workspaceId?: string;
  degraded?: boolean;
  unstructured?: boolean;
}) {
  const { pop } = useNavigation();
  const title =
    text
      .split("\n")
      .map((line) => line.trim())
      .find(Boolean)
      ?.slice(0, 160) ?? "Raw capture";

  const queueRawCapture = async () => {
    await showToast({ style: Toast.Style.Animated, title: "Queuing raw capture for review…" });
    try {
      const result = await submitCaptureGraph({
        workspaceId,
        source: "raycast",
        rawSource: { rawText: text, sourceUrl: url, label: sourceLabel },
        summary: "Save raw capture without AI structure",
        entities: [
          {
            ref: "raw-capture",
            profileSlug: "note",
            title,
            description: `Captured from ${sourceLabel}${url ? `: ${url}` : ""}`,
            content: text,
          },
        ],
      });
      await showToast({
        style: Toast.Style.Success,
        title: result.summary || "Raw capture queued for review",
        message: "Nothing has been applied yet.",
        ...(result.reviewUrl
          ? {
              primaryAction: {
                title: "Open review",
                onAction: () => open(result.reviewUrl!),
              },
            }
          : {}),
      });
      popToRoot();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not queue raw capture",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  return (
    <Detail
      navigationTitle="Save Raw Capture"
      markdown={`# ${degraded ? "AI structuring is unavailable" : unstructured ? "No structure was proposed" : "Keep the original capture"}\n\n${
        degraded
          ? "Nothing was structured. You can queue the original text as one reviewable raw note."
          : unstructured
            ? "Synap did not propose any entities. You can still queue the original text as one reviewable raw note."
            : "This preserves the original text exactly, without asking AI to classify it."
      }\n\n**Source:** ${sourceLabel}${url ? `\n\n**URL:** ${url}` : ""}\n\n**Destination:** ${workspaceId ? `Routed by Synap to workspace ${workspaceId}` : "Pod-wide capture"}`}
      actions={
        <ActionPanel>
          <Action title="Queue Raw Capture for Review" icon={Icon.Upload} onAction={queueRawCapture} />
          <Action.CopyToClipboard title="Copy Original Capture" content={text} />
          <Action title="Cancel Capture" icon={Icon.Xmark} onAction={pop} />
        </ActionPanel>
      }
    />
  );
}
