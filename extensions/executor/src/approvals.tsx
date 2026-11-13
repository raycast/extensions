import { WorkspaceAction } from "./components/workspace-command";
import { withWorkspace } from "./components/workspace-command";
import { Keyboard, Action, ActionPanel, Color, Icon, List, Toast, showToast, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { useRef, useState } from "react";
import { ExecutionResultView } from "./components/execution-result";
import { accountCacheKey, ExecutorError, request } from "./lib/client";
import { pausedInteraction } from "./lib/execution";
import { formatRelative } from "./lib/format";
import { forgetPendingApproval, listPendingApprovals, type PendingApprovalReference } from "./lib/pending-approvals";
import type { ExecutionResult } from "./lib/types";

interface PausedExecutionResponse {
  text: string;
  structured: unknown;
}

function Approvals() {
  const scope = accountCacheKey();
  const { push } = useNavigation();
  const opening = useRef(new Set<string>());
  const [openingId, setOpeningId] = useState<string>();
  const { data = [], isLoading, error, revalidate } = useCachedPromise(listPendingApprovals, [scope]);

  async function openApproval(reference: PendingApprovalReference) {
    if (opening.current.has(reference.executionId)) return;
    opening.current.add(reference.executionId);
    setOpeningId(reference.executionId);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Checking Approval" });
    try {
      const response = await request<PausedExecutionResponse>(
        `/api/executions/${encodeURIComponent(reference.executionId)}`,
      );
      const result: ExecutionResult = { status: "paused", text: response.text, structured: response.structured };
      const paused = pausedInteraction(result);
      if (!paused || paused.executionId !== reference.executionId) {
        throw new Error("Executor returned a different or invalid paused execution.");
      }
      toast.hide();
      push(<ExecutionResultView initial={result} code="" onResult={revalidate} />);
    } catch (approvalError) {
      if (approvalError instanceof ExecutorError && [404, 410].includes(approvalError.status)) {
        await forgetPendingApproval(scope, reference.executionId);
        await revalidate();
        toast.style = Toast.Style.Failure;
        toast.title = "Approval No Longer Available";
        toast.message = "The saved reference was removed. No call was retried.";
      } else {
        toast.hide();
        await showFailureToast(approvalError, { title: "Could Not Open Approval" });
      }
    } finally {
      opening.current.delete(reference.executionId);
      setOpeningId((current) => (current === reference.executionId ? undefined : current));
    }
  }

  return (
    <List isLoading={isLoading || openingId !== undefined} searchBarPlaceholder="Search recorded approvals">
      {error ? (
        <List.EmptyView
          icon={Icon.Warning}
          title="Could Not Load Approval Inbox"
          description={error.message}
          actions={
            <ActionPanel>
              <Action
                shortcut={Keyboard.Shortcut.Common.Refresh}
                title="Try Again"
                icon={Icon.RotateClockwise}
                onAction={revalidate}
              />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ) : data.length === 0 ? (
        <List.EmptyView
          icon={Icon.CheckCircle}
          title="No Recorded Approvals"
          description="Paused runs started by this extension appear here. Executor checks their current status when you open them."
          actions={
            <ActionPanel>
              <Action
                shortcut={Keyboard.Shortcut.Common.Refresh}
                title="Reload Inbox"
                icon={Icon.RotateClockwise}
                onAction={revalidate}
              />
              <WorkspaceAction />
            </ActionPanel>
          }
        />
      ) : (
        data.map((reference) => (
          <List.Item
            key={reference.executionId}
            icon={{ source: Icon.Shield, tintColor: Color.Orange }}
            title={reference.title}
            subtitle={reference.executionId}
            keywords={[reference.executionId]}
            accessories={[
              ...(formatRelative(reference.createdAt) ? [{ text: formatRelative(reference.createdAt) }] : []),
              ...(reference.expiresAt !== undefined && formatRelative(reference.expiresAt)
                ? [{ tag: { value: `Expires ${formatRelative(reference.expiresAt)}`, color: Color.Orange } }]
                : []),
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Review Approval"
                  shortcut={Keyboard.Shortcut.Common.Open}
                  icon={Icon.Eye}
                  onAction={() => openApproval(reference)}
                />
                <Action.CopyToClipboard
                  title="Copy Execution Identifier"
                  shortcut={Keyboard.Shortcut.Common.Copy}
                  content={reference.executionId}
                  icon={Icon.Clipboard}
                />
                <Action
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  title="Reload Inbox"
                  icon={Icon.RotateClockwise}
                  onAction={revalidate}
                />
                <WorkspaceAction />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

export default withWorkspace(Approvals);
