import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  Form,
  Icon,
  LaunchType,
  List,
  launchCommand,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import path from "path";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  allowClaudePermission,
  answerClaudeQuestion,
  approveClaudePlan,
  cancelClaudeQuestion,
  deferClaudePlan,
  denyClaudePermission,
  denyClaudePlan,
  dismissAgentWaiting,
  getClaudeHookStatus,
  getClaudeQuestionPaths,
  installClaudeQuestionHook,
  loadPendingClaudeInbox,
  uninstallClaudeQuestionHook,
  type ClaudeHookStatus,
} from "./lib/claude-question-store";
import type {
  ClaudeAgentWaitingRequest,
  ClaudeInboxRequest,
  ClaudePermissionRequest,
  ClaudePlanRequest,
  ClaudeQuestion,
  ClaudeQuestionRequest,
} from "./lib/ask-user-question-core";
import { shortcut } from "./lib/shortcuts";

interface QuestionLaunchContext {
  requestId?: string;
}

type QuestionFormValues = Record<string, string | string[]>;

export default function ClaudeQuestions(props: {
  launchContext?: QuestionLaunchContext;
}) {
  const [requests, setRequests] = useState<ClaudeInboxRequest[]>([]);
  const [hookStatus, setHookStatus] = useState<ClaudeHookStatus>();
  const [isLoading, setIsLoading] = useState(true);
  const refreshSequence = useRef(0);
  const requestFingerprint = useRef("");
  const hookFingerprint = useRef("");
  const refreshErrorFingerprint = useRef("");

  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const [nextRequests, nextStatus] = await Promise.all([
        loadPendingClaudeInbox(),
        getClaudeHookStatus(),
      ]);
      if (sequence !== refreshSequence.current) return;
      refreshErrorFingerprint.current = "";
      const nextRequestFingerprint = JSON.stringify(nextRequests);
      if (nextRequestFingerprint !== requestFingerprint.current) {
        requestFingerprint.current = nextRequestFingerprint;
        setRequests(nextRequests);
      }
      const nextHookFingerprint = JSON.stringify(nextStatus);
      if (nextHookFingerprint !== hookFingerprint.current) {
        hookFingerprint.current = nextHookFingerprint;
        setHookStatus(nextStatus);
      }
    } catch (error) {
      if (sequence !== refreshSequence.current) return;
      const message = error instanceof Error ? error.message : String(error);
      if (message !== refreshErrorFingerprint.current) {
        refreshErrorFingerprint.current = message;
        await showToast({
          style: Toast.Style.Failure,
          title: "Permission Inbox Could Not Be Refreshed",
          message,
        });
      }
    } finally {
      if (sequence === refreshSequence.current) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 1_000);
    return () => {
      clearInterval(timer);
      refreshSequence.current++;
    };
  }, [refresh]);

  const orderedRequests = useMemo(() => {
    const target = props.launchContext?.requestId;
    if (!target) return requests;
    return [...requests].sort((left, right) => {
      if (left.requestId === target) return -1;
      if (right.requestId === target) return 1;
      const timeDifference =
        Date.parse(left.createdAt) - Date.parse(right.createdAt);
      return timeDifference || left.requestId.localeCompare(right.requestId);
    });
  }, [props.launchContext?.requestId, requests]);

  const installHook = useCallback(async () => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Installing Claude Hooks",
    });
    try {
      const status = await installClaudeQuestionHook();
      setHookStatus(status);
      toast.style = Toast.Style.Success;
      toast.title = "Claude Hooks Installed";
      toast.message = "New Permission Requests Will Open in Raycast";
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Claude Hook Installation Failed";
      toast.message = error instanceof Error ? error.message : String(error);
    }
  }, []);

  const uninstallHook = useCallback(async () => {
    const confirmed = await confirmAlert({
      title: "Uninstall Claude Hooks",
      message:
        "ClaudeCast Will Stop Routing New Questions and Permission Requests through Raycast.",
      primaryAction: {
        title: "Uninstall Hooks",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;
    try {
      const status = await uninstallClaudeQuestionHook();
      setHookStatus(status);
      await showToast({
        style: Toast.Style.Success,
        title: "Claude Hooks Uninstalled",
      });
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Claude Hook Uninstall Failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Permission Inbox"
      searchBarPlaceholder="Search Pending Claude Requests"
    >
      <List.Section
        title="Pending Requests"
        subtitle={`${orderedRequests.length} Waiting`}
      >
        {orderedRequests.length === 0 && !isLoading ? (
          <List.Item
            title="No Pending Requests"
            subtitle="Claude requests will appear here when the hooks are installed."
            icon={Icon.CheckCircle}
            actions={
              <InboxListActions
                hookStatus={hookStatus}
                installHook={installHook}
                uninstallHook={uninstallHook}
                refresh={refresh}
              />
            }
          />
        ) : null}
        {orderedRequests.map((request) => (
          <List.Item
            key={request.requestId}
            title={requestTitle(request)}
            subtitle={requestSubtitle(request)}
            icon={requestIcon(request)}
            accessories={[
              { tag: eventLabel(request) },
              { text: sourceLabel(request) },
              { date: new Date(request.createdAt) },
            ]}
            actions={
              <RequestActions
                request={request}
                refresh={refresh}
                hookStatus={hookStatus}
                installHook={installHook}
                uninstallHook={uninstallHook}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section title="Hook Setup">
        <List.Item
          title="Permission Inbox Hooks"
          subtitle={
            hookStatus?.error ||
            (hookStatus?.installed
              ? "Installed for Claude Code"
              : "Not Installed")
          }
          icon={
            hookStatus?.installed
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : { source: Icon.Circle, tintColor: Color.SecondaryText }
          }
          accessories={[
            {
              tag: {
                value: hookStatus?.installed ? "Installed" : "Not Installed",
                color: hookStatus?.installed
                  ? Color.Green
                  : Color.SecondaryText,
              },
            },
          ]}
          actions={
            <InboxListActions
              hookStatus={hookStatus}
              installHook={installHook}
              uninstallHook={uninstallHook}
              refresh={refresh}
            />
          }
        />
      </List.Section>
    </List>
  );
}

function RequestActions({
  request,
  refresh,
  hookStatus,
  installHook,
  uninstallHook,
}: {
  request: ClaudeInboxRequest;
  refresh: () => Promise<void>;
  hookStatus: ClaudeHookStatus | undefined;
  installHook: () => Promise<void>;
  uninstallHook: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Request">
        {request.eventType === "question" ? (
          <>
            <Action.Push
              title="Answer Claude Question"
              icon={Icon.CheckCircle}
              target={
                <AnswerQuestionForm request={request} onAnswered={refresh} />
              }
            />
            <Action
              title="Cancel Claude Question"
              icon={Icon.XMarkCircle}
              style={Action.Style.Destructive}
              onAction={() => cancelQuestion(request, refresh)}
            />
          </>
        ) : (
          <Action.Push
            title="Review Request"
            icon={Icon.Eye}
            target={<RequestDetail request={request} onResolved={refresh} />}
          />
        )}
      </ActionPanel.Section>
      <InboxSetupActions
        hookStatus={hookStatus}
        installHook={installHook}
        uninstallHook={uninstallHook}
        refresh={refresh}
      />
    </ActionPanel>
  );
}

function InboxListActions(props: {
  hookStatus: ClaudeHookStatus | undefined;
  installHook: () => Promise<void>;
  uninstallHook: () => Promise<void>;
  refresh: () => Promise<void>;
}) {
  return (
    <ActionPanel>
      <InboxSetupActions {...props} />
    </ActionPanel>
  );
}

function InboxSetupActions({
  hookStatus,
  installHook,
  uninstallHook,
  refresh,
}: {
  hookStatus: ClaudeHookStatus | undefined;
  installHook: () => Promise<void>;
  uninstallHook: () => Promise<void>;
  refresh: () => Promise<void>;
}) {
  return (
    <ActionPanel.Section title="Setup">
      <Action
        title={
          hookStatus?.installed ? "Repair Claude Hooks" : "Install Claude Hooks"
        }
        icon={Icon.WrenchScrewdriver}
        onAction={installHook}
      />
      {hookStatus?.installed ? (
        <Action
          title="Uninstall Claude Hooks"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          onAction={uninstallHook}
        />
      ) : null}
      <Action
        title="Refresh Requests"
        icon={Icon.ArrowClockwise}
        shortcut={shortcut.refresh}
        onAction={refresh}
      />
      <Action.ShowInFinder
        title="Open Permission Inbox Folder"
        path={getClaudeQuestionPaths().root}
      />
      {hookStatus ? (
        <Action.CopyToClipboard
          title="Copy Claude Settings Path"
          content={hookStatus.settingsPath}
        />
      ) : null}
    </ActionPanel.Section>
  );
}

function AnswerQuestionForm({
  request,
  onAnswered,
}: {
  request: ClaudeQuestionRequest;
  onAnswered: () => Promise<void>;
}) {
  const { pop } = useNavigation();

  async function submit(values: QuestionFormValues) {
    try {
      const answers = Object.fromEntries(
        request.questions.map((question, index) => [
          question.question,
          resolveQuestionAnswer(question, index, values),
        ]),
      );
      const missing = Object.entries(answers).find(([, answer]) => !answer);
      if (missing) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Answer Required",
          message: missing[0],
        });
        return;
      }
      await answerClaudeQuestion(request, answers);
      await onAnswered();
      await showToast({
        style: Toast.Style.Success,
        title: "Answer Sent to Claude",
      });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Answer Could Not Be Sent",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return (
    <Form
      navigationTitle="Answer Claude Question"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Claude Answers"
            icon={Icon.CheckCircle}
            onSubmit={submit}
          />
          <Action
            title="Cancel Claude Question"
            icon={Icon.XMarkCircle}
            style={Action.Style.Destructive}
            onAction={async () => {
              await cancelClaudeQuestion(request);
              await onAnswered();
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Claude Needs Input"
        text={`${request.questions.length} Question${request.questions.length === 1 ? "" : "s"} From ${sourceLabel(request)}`}
      />
      {request.questions.map((question, index) => (
        <QuestionField
          key={`${request.requestId}:${index}`}
          question={question}
          index={index}
        />
      ))}
    </Form>
  );
}

function QuestionField({
  question,
  index,
}: {
  question: ClaudeQuestion;
  index: number;
}) {
  const title = question.header || `Question ${index + 1}`;
  const choiceId = `choice_${index}`;
  const customId = `custom_${index}`;

  return (
    <>
      <Form.Description title={title} text={question.question} />
      {question.options.length > 0 ? (
        question.multiSelect ? (
          <Form.TagPicker id={choiceId} title="Select Options">
            {question.options.map((option) => (
              <Form.TagPicker.Item
                key={`${choiceId}:${option.label}`}
                value={option.label}
                title={option.label}
                icon={option.description ? Icon.Info : undefined}
              />
            ))}
          </Form.TagPicker>
        ) : (
          <Form.Dropdown id={choiceId} title="Select an Option">
            {question.options.map((option) => (
              <Form.Dropdown.Item
                key={`${choiceId}:${option.label}`}
                value={option.label}
                title={
                  option.description
                    ? `${option.label}: ${option.description}`
                    : option.label
                }
              />
            ))}
          </Form.Dropdown>
        )
      ) : null}
      <Form.TextArea
        id={customId}
        title={
          question.options.length > 0
            ? question.multiSelect
              ? "Additional Answer"
              : "Custom Answer"
            : "Answer"
        }
        placeholder={
          question.options.length > 0
            ? "Optional Custom Answer"
            : "Type an Answer for Claude"
        }
      />
    </>
  );
}

function RequestDetail({
  request,
  onResolved,
}: {
  request: Exclude<ClaudeInboxRequest, ClaudeQuestionRequest>;
  onResolved: () => Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Detail
      navigationTitle={requestTitle(request)}
      markdown={requestMarkdown(request)}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Request Type"
            text={eventLabel(request)}
          />
          <Detail.Metadata.Label title="Source" text={sourceLabel(request)} />
          <Detail.Metadata.Label
            title="Requested at"
            text={new Date(request.createdAt).toLocaleString()}
          />
          {request.eventType === "permission" ? (
            <Detail.Metadata.Label title="Tool" text={request.toolName} />
          ) : null}
          {request.eventType === "permission" && request.permissionMode ? (
            <Detail.Metadata.Label
              title="Permission Mode"
              text={request.permissionMode}
            />
          ) : null}
          {request.eventType === "plan" ? (
            <Detail.Metadata.Label
              title="Plan File"
              text={request.planFilePath}
            />
          ) : null}
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {request.eventType === "permission" ? (
            <PermissionActions
              request={request}
              onResolved={async () => {
                await onResolved();
                pop();
              }}
            />
          ) : request.eventType === "plan" ? (
            <PlanActions
              request={request}
              onResolved={async () => {
                await onResolved();
                pop();
              }}
            />
          ) : (
            <AgentWaitingActions
              request={request}
              onResolved={async () => {
                await onResolved();
                pop();
              }}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function PermissionActions({
  request,
  onResolved,
}: {
  request: ClaudePermissionRequest;
  onResolved: () => Promise<void>;
}) {
  return (
    <ActionPanel.Section title="Permission">
      <Action
        title="Allow Tool"
        icon={Icon.CheckCircle}
        onAction={async () => {
          await resolveWithToast(
            () => allowClaudePermission(request),
            onResolved,
            "Permission Allowed",
          );
        }}
      />
      <Action.Push
        title="Deny Tool with Reason"
        icon={Icon.XMarkCircle}
        target={
          <DenialReasonForm
            title="Deny Tool"
            onSubmit={(reason) => denyClaudePermission(request, reason)}
            onResolved={onResolved}
          />
        }
      />
    </ActionPanel.Section>
  );
}

function PlanActions({
  request,
  onResolved,
}: {
  request: ClaudePlanRequest;
  onResolved: () => Promise<void>;
}) {
  return (
    <ActionPanel.Section title="Plan">
      <Action
        title="Approve Plan"
        icon={Icon.CheckCircle}
        onAction={async () => {
          await resolveWithToast(
            () => approveClaudePlan(request),
            onResolved,
            "Plan Approved",
          );
        }}
      />
      <Action.Push
        title="Deny Plan with Reason"
        icon={Icon.XMarkCircle}
        target={
          <DenialReasonForm
            title="Deny Plan"
            onSubmit={(reason) => denyClaudePlan(request, reason)}
            onResolved={onResolved}
          />
        }
      />
      <Action
        title="Defer Plan"
        icon={Icon.Clock}
        onAction={async () => {
          await resolveWithToast(
            () => deferClaudePlan(request),
            onResolved,
            "Plan Deferred",
          );
        }}
      />
    </ActionPanel.Section>
  );
}

function AgentWaitingActions({
  request,
  onResolved,
}: {
  request: ClaudeAgentWaitingRequest;
  onResolved: () => Promise<void>;
}) {
  return (
    <ActionPanel.Section title="Agent">
      <Action
        title="Open Manage Agents"
        icon={Icon.Terminal}
        onAction={() =>
          launchCommand({
            name: "manage-agents",
            type: LaunchType.UserInitiated,
          })
        }
      />
      <Action
        title="Dismiss Waiting Notice"
        icon={Icon.XMarkCircle}
        onAction={async () => {
          await dismissAgentWaiting(request);
          await onResolved();
        }}
      />
    </ActionPanel.Section>
  );
}

function DenialReasonForm({
  title,
  onSubmit,
  onResolved,
}: {
  title: string;
  onSubmit: (reason: string) => Promise<void>;
  onResolved: () => Promise<void>;
}) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle={title}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Submit Denial"
            icon={Icon.XMarkCircle}
            onSubmit={async (values: { reason: string }) => {
              const reason = values.reason?.trim();
              if (!reason) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Denial Reason Required",
                });
                return;
              }
              try {
                await onSubmit(reason);
                await onResolved();
                pop();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Request Denied",
                });
              } catch (error) {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Denial Could Not Be Sent",
                  message:
                    error instanceof Error ? error.message : String(error),
                });
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="reason"
        title="Denial Reason"
        placeholder="Explain Why Claude Should Not Continue"
      />
    </Form>
  );
}

async function resolveWithToast(
  action: () => Promise<void>,
  onResolved: () => Promise<void>,
  successTitle: string,
): Promise<void> {
  try {
    await action();
    await onResolved();
    await showToast({ style: Toast.Style.Success, title: successTitle });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Response Could Not Be Sent",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function cancelQuestion(
  request: ClaudeQuestionRequest,
  refresh: () => Promise<void>,
): Promise<void> {
  await cancelClaudeQuestion(request);
  await refresh();
  await showToast({
    style: Toast.Style.Success,
    title: "Claude Question Cancelled",
  });
}

function resolveQuestionAnswer(
  question: ClaudeQuestion,
  index: number,
  values: QuestionFormValues,
): string {
  const selected = values[`choice_${index}`];
  const custom = values[`custom_${index}`];
  const customText = typeof custom === "string" ? custom.trim() : "";

  if (question.multiSelect) {
    const labels = Array.isArray(selected) ? [...selected] : [];
    if (customText) labels.push(customText);
    return labels.join(", ");
  }
  if (customText) return customText;
  return typeof selected === "string" ? selected.trim() : "";
}

function requestTitle(request: ClaudeInboxRequest): string {
  if (request.eventType === "question") {
    return request.questions[0]?.header || "Claude Needs Input";
  }
  if (request.eventType === "permission") {
    return `${request.toolName} Permission`;
  }
  if (request.eventType === "plan") return "Plan Approval";
  return request.title || "Agent Needs Input";
}

function requestSubtitle(request: ClaudeInboxRequest): string {
  if (request.eventType === "question") {
    return request.questions[0]?.question || "Claude Asked a Question";
  }
  if (request.eventType === "permission") {
    return request.toolSummary || "Review Tool Input Before Allowing It";
  }
  if (request.eventType === "plan") {
    return firstNonemptyLine(request.plan) || request.planFilePath;
  }
  return request.message;
}

function requestIcon(request: ClaudeInboxRequest) {
  if (request.eventType === "question") {
    return { source: Icon.QuestionMark, tintColor: Color.Orange };
  }
  if (request.eventType === "permission") {
    return { source: Icon.Lock, tintColor: Color.Red };
  }
  if (request.eventType === "plan") {
    return { source: Icon.Document, tintColor: Color.Blue };
  }
  return { source: Icon.Bell, tintColor: Color.Orange };
}

function eventLabel(request: ClaudeInboxRequest): string {
  if (request.eventType === "question") return "Question";
  if (request.eventType === "permission") return "Permission";
  if (request.eventType === "plan") return "Plan";
  return "Agent Waiting";
}

function requestMarkdown(
  request:
    | ClaudePermissionRequest
    | ClaudePlanRequest
    | ClaudeAgentWaitingRequest,
): string {
  if (request.eventType === "permission") {
    const summary = request.toolSummary
      ? `## Tool Summary\n\n${markdownCode(request.toolSummary)}\n\n`
      : "";
    return `${summary}## Tool Input\n\n${markdownCode(request.toolInputPreview)}`;
  }
  if (request.eventType === "plan") {
    return `## Proposed Plan\n\n${markdownCode(request.plan)}`;
  }
  return `## Agent Status\n\n${markdownCode(request.message)}`;
}

function markdownCode(value: string): string {
  return ["```text", value.replace(/```/g, "`\u200b``"), "```"].join("\n");
}

function firstNonemptyLine(value: string): string | undefined {
  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^#+\s*/, "").trim())
    .find(Boolean);
}

function sourceLabel(request: ClaudeInboxRequest): string {
  if (request.cwd) return path.basename(request.cwd) || request.cwd;
  if (request.sessionId) return `Session ${request.sessionId.slice(-8)}`;
  return "Claude Code";
}
