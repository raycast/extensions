import {
  Action,
  ActionPanel,
  Clipboard,
  Detail,
  Form,
  getSelectedText,
  Icon,
  Keyboard,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { api, showError } from "./api";
import { withConnection } from "./connect";

const CHANNELS: [string, string][] = [
  ["web", "Anywhere"],
  ["instagram", "Instagram"],
  ["facebook", "Facebook"],
  ["threads", "Threads"],
  ["whatsapp", "WhatsApp"],
  ["gmail", "Email"],
  ["linkedin", "LinkedIn"],
  ["x", "X"],
  ["bluesky", "Bluesky"],
  ["tiktok", "TikTok"],
  ["youtube", "YouTube"],
  ["discord", "Discord"],
];

type Values = { message: string; channel: string; instruction: string };

function QuickReply() {
  const { push } = useNavigation();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      let t = "";
      try {
        t = (await getSelectedText()).trim();
      } catch {
        t = "";
      }
      if (!t) t = ((await Clipboard.readText()) || "").trim();
      setMessage(t.slice(0, 4000));
      setLoading(false);
    })();
  }, []);

  async function submit(v: Values) {
    if (!v.message.trim()) {
      await showToast({ style: Toast.Style.Failure, title: "Paste the message you are answering" });
      return;
    }
    const t = await showToast({ style: Toast.Style.Animated, title: "Writing in your voice…" });
    try {
      const r = await api<{ text: string }>("/reply", {
        method: "POST",
        body: {
          message: v.message,
          channel: v.channel,
          surface: v.channel === "gmail" ? "email" : "dm",
          instruction: v.instruction,
        },
      });
      await Clipboard.copy(r.text);
      t.hide();
      await showHUD("Reply copied");
      push(<ReplyResult text={r.text} again={() => submit(v)} />);
    } catch (e) {
      t.hide();
      await showError(e, "Could not write a reply");
    }
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Write Reply" icon={Icon.Wand} onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="Their message"
        value={message}
        onChange={setMessage}
        placeholder="Select text or copy it before opening this command"
      />
      <Form.Dropdown id="channel" title="Where" defaultValue="web" storeValue>
        {CHANNELS.map(([v, l]) => (
          <Form.Dropdown.Item key={v} value={v} title={l} />
        ))}
      </Form.Dropdown>
      <Form.TextField id="instruction" title="Say (optional)" placeholder="e.g. offer Thursday at 2" />
      <Form.Description text="Uses your brand voice. Counts as one reply on your plan." />
    </Form>
  );
}

function ReplyResult({ text, again }: { text: string; again: () => void }) {
  return (
    <Detail
      markdown={text}
      navigationTitle="Reply (copied)"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Again" content={text} />
          <Action.Paste
            title="Paste into Front App"
            content={text}
            shortcut={{
              macOS: { modifiers: ["cmd", "shift"], key: "v" },
              Windows: { modifiers: ["ctrl", "shift"], key: "v" },
            }}
          />
          <Action
            title="Write Another"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={again}
          />
        </ActionPanel>
      }
    />
  );
}

export default withConnection(QuickReply);
