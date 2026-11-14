import { Action, ActionPanel, Form, Icon, useNavigation } from "@raycast/api";
import { useEffect, useRef, useState } from "react";

export function Compose({
  text,
  change,
  send,
  description = "Your draft is saved on this Mac as you type. Nothing sends automatically, including after reconnecting. Send submits to the hub queue only when the Agent is online; a busy Agent receives it after the current turn.",
  title = "Compose Message",
  submitTitle = "Send Message",
}: {
  text: string;
  change: (text: string) => void;
  send: (text: string) => Promise<boolean>;
  description?: string;
  title?: string;
  submitTitle?: string;
}) {
  const [value, setValue] = useState(text);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const mounted = useRef(true);
  const { pop } = useNavigation();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return (
    <Form
      navigationTitle={title}
      isLoading={busy}
      enableDrafts={false}
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title={submitTitle}
            icon={Icon.ArrowUp}
            onSubmit={async () => {
              if (lock.current || !mounted.current) return;
              lock.current = true;
              setBusy(true);
              try {
                if ((await send(value)) && mounted.current) pop();
              } finally {
                lock.current = false;
                if (mounted.current) setBusy(false);
              }
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={description} />
      <Form.TextArea
        id="text"
        title="Message"
        value={value}
        onChange={(next) => {
          setValue(next);
          change(next);
        }}
        error={value.length > 100_000 ? "Maximum 100,000 characters" : undefined}
        autoFocus
      />
    </Form>
  );
}
