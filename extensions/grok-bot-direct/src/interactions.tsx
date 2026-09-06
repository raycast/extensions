import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Detail,
  Form,
  Icon,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useRef, useState } from "react";
import { Entry } from "./core/client";
import {
  answerQuestion,
  approvalOf,
  questionOf,
  resolveApproval,
} from "./core/interactions";
import { client } from "./session";

export function QuestionForm({
  agentId,
  entry,
  finished,
}: {
  agentId: string;
  entry: Entry;
  finished: () => void;
}): React.JSX.Element {
  const question = questionOf(entry);
  const [busy, setBusy] = useState(false);
  const [value, setValue] = useState(question?.options[0]?.value ?? "");
  const [other, setOther] = useState("");
  const locked = useRef(false);
  const { pop } = useNavigation();
  async function submit(): Promise<void> {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    try {
      await answerQuestion(client, agentId, entry, other.trim() || value);
      finished();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Couldn’t send response",
        message:
          error instanceof Error ? error.message : "Refresh and try again.",
      });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <Form
      isLoading={busy}
      navigationTitle="Answer Bot"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send Response" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.Description
        title="Question"
        text={question?.prompt ?? "Question unavailable"}
      />
      {!!question?.options.length && (
        <Form.Dropdown
          id="choice"
          title="Response"
          value={value}
          onChange={setValue}
        >
          {question.options.map((option) => (
            <Form.Dropdown.Item
              key={option.value}
              title={option.label}
              value={option.value}
            />
          ))}
        </Form.Dropdown>
      )}
      <Form.TextArea
        id="other"
        title={question?.options.length ? "Custom response" : "Response"}
        value={other}
        onChange={setOther}
      />
    </Form>
  );
}

export function ApprovalView({
  agentId,
  entry,
  finished,
}: {
  agentId: string;
  entry: Entry;
  finished: () => void;
}): React.JSX.Element {
  const approval = approvalOf(entry);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const { pop } = useNavigation();
  async function resolve(resolution: "approved" | "denied"): Promise<void> {
    if (!approval || locked.current) return;
    if (
      !(await confirmAlert({
        title:
          resolution === "approved"
            ? "Approve this action once?"
            : "Deny this action?",
        message:
          approval.summary +
          (approval.command ? `\n\n${approval.command}` : ""),
        primaryAction: {
          title: resolution === "approved" ? "Approve Once" : "Deny",
          style: Alert.ActionStyle.Default,
        },
      }))
    )
      return;
    locked.current = true;
    setBusy(true);
    try {
      await resolveApproval(client, agentId, entry, resolution);
      finished();
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Approval not confirmed",
        message:
          error instanceof Error ? error.message : "Refresh and try again.",
      });
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  const fence = "`".repeat(
    Math.max(
      3,
      ...(approval?.command.match(/`+/g) ?? []).map((s) => s.length + 1),
    ),
  );
  return (
    <Detail
      isLoading={busy}
      navigationTitle="Review Bot Action"
      markdown={`# Approval request\n\n${approval?.summary ?? "Approval unavailable"}\n\n${fence}\n${approval?.command ?? ""}\n${fence}`}
      actions={
        <ActionPanel>
          <Action
            title="Approve Once"
            icon={Icon.CheckCircle}
            onAction={() => resolve("approved")}
          />
          <Action
            title="Deny"
            icon={Icon.XMarkCircle}
            onAction={() => resolve("denied")}
          />
        </ActionPanel>
      }
    />
  );
}
