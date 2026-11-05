import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { showFailureToast, useForm } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { errorMessage, isCancelled, recoveryHint } from "../lib/errors";
import { client, validateTypedText } from "../lib/ghosthand-client";
import { withLease } from "../lib/leases";
import type { Phone, QuickAction } from "../lib/types";
import { markdownText } from "../utils/device-status";
import { ScreenPreview } from "./ScreenPreview";

function useQuickAction(phone: Phone) {
  const active = useRef<AbortController | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string>();
  useEffect(() => () => active.current?.abort(), []);
  async function perform(action: QuickAction, title: string): Promise<boolean> {
    if (active.current) return false;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setFailure(undefined);
    let notice: string | undefined;
    try {
      if (["tap", "enter", "lock"].includes(action.kind)) {
        const message =
          action.kind === "tap"
            ? `Tap “${action.text}” on ${phone.name}? Approve any sending, deletion, or purchase this button performs. OCR may match similar labels.`
            : action.kind === "enter"
              ? `Press Enter on ${phone.name}? This may send a message, submit a form, or confirm a purchase in the focused app.`
              : `Lock ${phone.name}? You will need to unlock it by hand before viewing its screen again.`;
        if (
          !(await confirmAlert({
            title,
            message,
            primaryAction: { title: "Continue", style: Alert.ActionStyle.Default },
            dismissAction: { title: "Cancel" },
          }))
        )
          return false;
      }
      const result = await withLease(client, phone, title, controller.signal, (lease) => {
        notice = lease.notice;
        return client.input(lease.id, action, controller.signal);
      });
      if (!controller.signal.aborted) {
        const message = [result.message, notice && `Ghosthand account notice: ${notice}`].filter(Boolean).join("\n\n");
        await showToast({
          style: Toast.Style.Success,
          title,
          message,
        });
      }
      return true;
    } catch (error) {
      if (!controller.signal.aborted) {
        const detail = [errorMessage(error), notice && `Ghosthand account notice: ${notice}`]
          .filter(Boolean)
          .join("\n\n");
        setFailure(`${detail}\n\n${recoveryHint(error)}`);
        if (!isCancelled(error)) await showFailureToast(error, { title: "Action not confirmed", message: detail });
      }
      return false;
    } finally {
      active.current = undefined;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return { perform, busy, failure };
}

export function QuickActions({ phone }: { phone: Phone }) {
  const { perform, busy, failure } = useQuickAction(phone);
  const items: { title: string; icon: Icon; action: QuickAction }[] = [
    { title: "Home Screen", icon: Icon.House, action: { kind: "home" } },
    { title: "Scroll Up", icon: Icon.ArrowUp, action: { kind: "scroll", direction: "up" } },
    { title: "Scroll Down", icon: Icon.ArrowDown, action: { kind: "scroll", direction: "down" } },
    { title: "Lock iPhone", icon: Icon.Lock, action: { kind: "lock" } },
    { title: "Mute", icon: Icon.SpeakerOff, action: { kind: "mute", muted: true } },
    { title: "Unmute", icon: Icon.SpeakerOn, action: { kind: "mute", muted: false } },
    { title: "Press Enter…", icon: Icon.ArrowRight, action: { kind: "enter" } },
  ];
  return (
    <List
      navigationTitle={`Quick Actions · ${phone.name}`}
      isLoading={busy}
      isShowingDetail={!!failure}
      searchBarPlaceholder="Search iPhone actions…"
    >
      {failure && (
        <List.Item
          title="Inspect the Screen Before Retrying"
          icon={Icon.ExclamationMark}
          detail={<List.Item.Detail markdown={markdownText(failure)} />}
          actions={
            <ActionPanel>
              <Action.Push
                title="View Current Screen"
                icon={Icon.Mobile}
                target={<ScreenPreview phone={phone} allowControl={false} />}
              />
            </ActionPanel>
          }
        />
      )}
      {items.map((item) => (
        <List.Item
          key={item.title}
          title={item.title}
          icon={item.icon}
          actions={
            <ActionPanel>
              <Action title={item.title} icon={item.icon} onAction={() => perform(item.action, item.title)} />
              <Action.Push
                title="View Current Screen"
                icon={Icon.Mobile}
                target={<ScreenPreview phone={phone} allowControl={false} />}
              />
            </ActionPanel>
          }
        />
      ))}
      {!busy && (
        <>
          <List.Item
            title="Type Text"
            subtitle="Printable US-ASCII · Does not press Enter"
            icon={Icon.Keyboard}
            actions={
              <ActionPanel>
                <Action.Push title="Type Text" target={<InputForm phone={phone} kind="type" />} icon={Icon.Keyboard} />
              </ActionPanel>
            }
          />
          <List.Item
            title="Tap Text"
            subtitle="Tap a visible label using OCR"
            icon={Icon.BullsEye}
            actions={
              <ActionPanel>
                <Action.Push title="Tap Text" target={<InputForm phone={phone} kind="tap" />} icon={Icon.BullsEye} />
              </ActionPanel>
            }
          />
        </>
      )}
    </List>
  );
}

function InputForm({ phone, kind }: { phone: Phone; kind: "type" | "tap" }) {
  const { perform, busy, failure } = useQuickAction(phone);
  const { pop } = useNavigation();
  const title = kind === "type" ? "Type Text" : "Tap Text";
  const { handleSubmit, itemProps } = useForm({
    initialValues: { text: "" },
    validation: {
      text: (text) =>
        kind === "type" ? validateTypedText(text ?? "") : text?.trim() ? undefined : "Enter a visible text label.",
    },
    async onSubmit({ text }) {
      if (await perform({ kind, text }, title)) pop();
    },
  });
  return (
    <Form
      navigationTitle={`${title} · ${phone.name}`}
      isLoading={busy}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={title}
            icon={kind === "type" ? Icon.Keyboard : Icon.BullsEye}
            onSubmit={handleSubmit}
          />
          <Action.Push
            title="View Current Screen"
            icon={Icon.Mobile}
            target={<ScreenPreview phone={phone} allowControl={false} />}
          />
        </ActionPanel>
      }
    >
      <Form.Description
        text={
          kind === "type"
            ? "Focus the destination field on your iPhone first. Only printable US-ASCII is supported. Newlines and tabs are rejected; use the separate Press Enter action to submit."
            : "Enter text currently visible on the screen. Ghosthand finds the matching label using OCR. Ambiguous matches are reported without choosing one automatically."
        }
      />
      <Form.TextField
        {...itemProps.text}
        title={kind === "type" ? "Text" : "Visible Label"}
        placeholder={kind === "type" ? "Hello, world!" : "General"}
      />
      {failure && <Form.Description title="Action Not Confirmed" text={failure} />}
    </Form>
  );
}
