import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { useTasks } from "../task-state";
import { CommonActions } from "./common-actions";
import { RAYCAST_REDIRECT_URI } from "../vendor/raycast-auth";

export function TaskReview() {
  const { snapshot, streamingMessage, busy, error, perform } = useTasks();
  const { pop } = useNavigation();
  const [message, setMessage] = useState("");
  const [multiline, setMultiline] = useState(false);
  const [validation, setValidation] = useState<string>();
  const [pendingMessage, setPendingMessage] = useState<{ content: string; chatLength: number } | null>(null);
  const sending = useRef(false);
  const draftVersion = useRef(0);
  const closed = useRef(false);
  useEffect(() => {
    if (!snapshot || snapshot.review || closed.current) return;
    closed.current = true;
    pop();
  }, [snapshot, pop]);
  if (!snapshot?.review) return null;
  const review = snapshot.review;
  const ReplyInput = multiline ? Form.TextArea : Form.TextField;
  const checking = review.status === "checking";
  const showPendingMessage =
    pendingMessage &&
    !review.chat.some(
      (entry, index) =>
        index >= pendingMessage.chatLength && entry.role === "user" && entry.content === pendingMessage.content,
    );
  const waiting = busy || checking || !!showPendingMessage;
  const chat = showPendingMessage
    ? [...review.chat, { role: "user" as const, content: pendingMessage.content }]
    : review.chat;
  const editTask = () => {
    if (waiting || closed.current) return;
    closed.current = true;
    pop();
  };
  const submit = async () => {
    if (waiting || sending.current) return;
    if (!message.trim() || message.trim().length > snapshot.descriptionLimit) {
      setValidation(
        !message.trim()
          ? "A message is required."
          : `Messages must be ${snapshot.descriptionLimit} characters or fewer.`,
      );
      return;
    }
    setValidation(undefined);
    sending.current = true;
    const sentMessage = message;
    const sentDraftVersion = draftVersion.current;
    setMessage("");
    setMultiline(false);
    setPendingMessage({ content: message.trim(), chatLength: review.chat.length });
    try {
      if (!(await perform({ kind: "review-message", message: message.trim() }, snapshot))) {
        setPendingMessage(null);
        if (draftVersion.current === sentDraftVersion) setMessage(sentMessage);
      }
    } finally {
      sending.current = false;
    }
  };
  return (
    <Form
      navigationTitle="Happy Squid"
      isLoading={waiting}
      searchBarAccessory={
        !busy ? (
          <Form.LinkAccessory
            text="Cancel"
            target={`${RAYCAST_REDIRECT_URI}?context=${encodeURIComponent(
              JSON.stringify({ cancelReview: { reviewId: review.id, taskId: snapshot.task?.id ?? null } }),
            )}`}
          />
        ) : null
      }
      actions={
        <ActionPanel>
          {waiting ? (
            <Action title="Checking Task" icon={Icon.Hourglass} onAction={submit} />
          ) : (
            <Action.SubmitForm
              title="Send Reply"
              icon={Icon.Message}
              shortcut={{ modifiers: [], key: "return" }}
              onSubmit={submit}
            />
          )}
          {!multiline && <Action title="Expand Reply" icon={Icon.ArrowsExpand} onAction={() => setMultiline(true)} />}
          {!waiting && (
            <Action
              title="Edit Task"
              icon={Icon.Pencil}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
              onAction={editTask}
            />
          )}
          {!busy && (
            <Action
              title={review.kind === "edit" ? "Discard Edit" : "Cancel Task"}
              icon={Icon.Xmark}
              onAction={() => perform({ kind: "review-cancel" }, snapshot)}
            />
          )}
          <CommonActions />
        </ActionPanel>
      }
    >
      <Form.Description title="Task" text={review.description} />
      <Form.Separator />
      {chat.map((entry, index) => (
        <Form.Description key={index} title={entry.role === "user" ? "You" : "Happy Squid"} text={entry.content} />
      ))}
      {(checking || showPendingMessage) && review.chat.some((entry) => entry.role === "assistant") && (
        <Form.Description title="Happy Squid" text={streamingMessage || "..."} />
      )}
      <ReplyInput
        id="reply"
        title="Reply"
        placeholder="Message Happy Squid"
        autoFocus
        value={message}
        onChange={(value) => {
          draftVersion.current += 1;
          setMessage(value);
          setValidation(undefined);
        }}
        error={validation}
      />
      {error && <Form.Description text={error} />}
    </Form>
  );
}
