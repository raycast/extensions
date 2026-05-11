import { Action, ActionPanel, AI, Icon, Keyboard, open, showToast, Toast, useNavigation } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

import { extractOTP, getAttachmentType, getMessagesUrl } from "../helpers";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { Message } from "../hooks/useMessages";

import Details from "./Details";
import Instructions from "./Instructions";
import OpenInMessages from "./OpenInMessages";
import Reply from "./Reply";

type MessageActionsProps = {
  message: Message;
  mutate?: () => void;
  showDetails?: boolean;
};

export default function MessageActions({ message, mutate, showDetails = true }: MessageActionsProps) {
  const { push } = useNavigation();

  const { value: instructions, setValue: setInstructions } = useLocalStorage<Record<string, string>>(
    "instructions",
    {},
  );

  async function getAIReply() {
    const instructionsForSender = instructions?.[message.sender] || "";
    const generalInstructions = instructions?.general || "";
    const replyExamples = instructions?.examples || "";

    const toast = await showToast({ title: "Generating reply", style: Toast.Style.Animated });

    let prompt = `Reply to a message from ${message.senderName}. Only return the reply, not any other text.`;

    if (generalInstructions) {
      prompt += `\n\nHere are some general instructions:\n${generalInstructions}`;
    }

    if (replyExamples) {
      prompt += `\n\nInspire yourself from these examples for my writing style:\n${replyExamples}`;
    }

    if (instructionsForSender) {
      prompt += `\n\nHere are additional instructions for ${message.senderName}:\n${instructionsForSender}`;
    }

    prompt += `\n\nMessage: ${message.body}\n\nAnswer:`;

    const reply = await AI.ask(prompt, { model: AI.Model["OpenAI_GPT4o-mini"] });
    toast.hide();
    return reply;
  }

  async function smartReplyFromRaycast() {
    try {
      const reply = await getAIReply();
      push(<Reply message={message} initialReply={reply} />);
    } catch (error) {
      await showFailureToast(error, { title: "Failed to generate reply" });
    }
  }

  async function smartReplyFromMessages() {
    try {
      const reply = await getAIReply();
      await open(getMessagesUrl(message, reply));
    } catch (error) {
      await showFailureToast(error, { title: "Failed to generate reply" });
    }
  }

  const otp = extractOTP(message.body);

  const attachmentType = getAttachmentType(message);

  const cannotReplyFromRaycast = message.is_group && !message.group_name;
  const cannotOpenInMessages = message.is_group && message.group_name;

  return (
    <ActionPanel>
      {cannotReplyFromRaycast ? null : (
        <Action.Push title="Reply" icon={Icon.Reply} target={<Reply message={message} />} onPop={mutate} />
      )}
      {cannotOpenInMessages ? null : <OpenInMessages chat={message} />}
      {showDetails ? (
        <Action.Push
          title="See Details"
          icon={Icon.Sidebar}
          target={<Details message={message} />}
          shortcut={{ modifiers: ["cmd", "shift"], key: "d" }}
        />
      ) : null}

      {message.attachment_filename ? <Action.ToggleQuickLook title={attachmentType?.actionTitle} /> : null}

      <ActionPanel.Section title="AI Reply">
        {cannotReplyFromRaycast ? null : (
          <Action
            title="Reply from Raycast"
            icon={Icon.RaycastLogoNeg}
            onAction={smartReplyFromRaycast}
            shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
          />
        )}
        {cannotOpenInMessages ? null : (
          <Action
            title="Reply from Messages"
            icon={Icon.SpeechBubble}
            onAction={smartReplyFromMessages}
            shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
          />
        )}
        <Action.Push
          title="AI Instructions"
          icon={Icon.Paragraph}
          target={<Instructions message={message} instructions={instructions} setInstructions={setInstructions} />}
        />
      </ActionPanel.Section>

      <ActionPanel.Section>
        {otp ? (
          <>
            {/* eslint-disable-next-line @raycast/prefer-title-case */}
            <Action.Paste title="Paste OTP Code" content={otp} shortcut={{ modifiers: ["cmd", "shift"], key: "p" }} />
            <Action.CopyToClipboard
              // eslint-disable-next-line @raycast/prefer-title-case
              title="Copy OTP Code"
              content={otp}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </>
        ) : null}
        <Action.CopyToClipboard
          title="Copy Message"
          content={message.body}
          shortcut={Keyboard.Shortcut.Common.CopyName}
        />
        {mutate && (
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={mutate}
            shortcut={Keyboard.Shortcut.Common.Refresh}
          />
        )}
      </ActionPanel.Section>
    </ActionPanel>
  );
}
