import { Action, Detail, environment, Icon, Keyboard, useNavigation, type LaunchProps } from "@raycast/api";
import { useEffect, useState } from "react";
import { RecipientList } from "./components/RecipientList";
import { TextForm } from "./components/SendForms";
import { readClipboardContent, type SendContent } from "./lib/content";
import type { Recipient } from "./lib/model";
import type { QuickSendSetupContext } from "./lib/quick-send";
import { sendToRecipient } from "./lib/send";

export default function Command({ launchContext }: LaunchProps<{ launchContext?: QuickSendSetupContext }>) {
  // undefined = still reading, null = empty clipboard.
  const [content, setContent] = useState<SendContent | null>();

  useEffect(() => {
    readClipboardContent(environment.supportPath)
      .then((value) => setContent(value ?? null))
      .catch(() => setContent(null));
  }, []);

  if (content === null) {
    return <Detail markdown={"# The clipboard is empty\n\nCopy some text, an image or files, then try again."} />;
  }

  return (
    <RecipientList
      content={content}
      rememberForQuickSend={launchContext?.setupQuickSend}
      extraActions={(recipient) =>
        content?.kind === "text" && (
          <Action.Push
            title="Edit Text Before Sending…"
            icon={Icon.Pencil}
            shortcut={Keyboard.Shortcut.Common.Edit}
            target={<EditAndSend recipient={recipient} text={content.text} />}
          />
        )
      }
    />
  );
}

function EditAndSend({ recipient, text }: { recipient: Recipient; text: string }) {
  const { pop } = useNavigation();
  return (
    <TextForm
      navigationTitle={`Send Text to ${recipient.name}`}
      submitTitle={`Send to ${recipient.name}`}
      initialText={text}
      onSubmit={async (edited) => {
        if (await sendToRecipient(recipient, { kind: "text", text: edited, source: "Clipboard (edited)" })) pop();
      }}
    />
  );
}
