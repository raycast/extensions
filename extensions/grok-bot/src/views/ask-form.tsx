import { Action, ActionPanel, Form, Icon, Toast, showHUD, showToast, useNavigation } from "@raycast/api";
import { useForm, FormValidation } from "@raycast/utils";
import { useState } from "react";
import { botListIcon } from "../lib/bot-icon";
import { sendPrompt } from "../lib/gateway";
import { setLastBotId } from "../lib/last-bot";
import { AgentId, Bot, gatewayErrorMessage, parseAgentId } from "../lib/types";
import { OpenGrokBotAction } from "./open-grok-bot-action";

type AskFormValues = {
  botId: string;
  message: string;
};

type AskFormProps = {
  bots: Bot[];
  initialBotId?: AgentId;
  initialMessage?: string;
  onSuccess?: () => void;
};

function dropdownGroups(bots: Bot[]): { groups: Bot[]; hidden: Bot[]; individuals: Bot[] } {
  return {
    individuals: bots.filter((bot) => !bot.isGroup && !bot.isHidden),
    groups: bots.filter((bot) => bot.isGroup && !bot.isHidden),
    hidden: bots.filter((bot) => bot.isHidden),
  };
}

export function AskForm({ bots, initialBotId, initialMessage = "", onSuccess }: AskFormProps) {
  const { pop } = useNavigation();
  const [submitting, setSubmitting] = useState(false);
  const { groups, hidden, individuals } = dropdownGroups(bots);

  const { handleSubmit, itemProps } = useForm<AskFormValues>({
    onSubmit: async (values) => {
      setSubmitting(true);
      try {
        const agentIdResult = parseAgentId(values.botId);
        if (!agentIdResult.ok) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Send failed",
            message: agentIdResult.error,
          });
          return;
        }

        const bot = bots.find((entry) => entry.id === agentIdResult.value);
        const result = await sendPrompt({
          agentId: agentIdResult.value,
          prompt: values.message.trim(),
        });

        if (!result.ok) {
          await showToast({
            style: Toast.Style.Failure,
            title: "Send failed",
            message: gatewayErrorMessage(result.error),
          });
          return;
        }

        await setLastBotId(agentIdResult.value);
        await showHUD(`Sent to ${bot?.name ?? "bot"}`);

        if (onSuccess) {
          onSuccess();
        } else {
          pop();
        }
      } finally {
        setSubmitting(false);
      }
    },
    validation: {
      botId: FormValidation.Required,
      message: FormValidation.Required,
    },
    initialValues: {
      botId: initialBotId ?? bots[0]?.id ?? "",
      message: initialMessage,
    },
  });

  return (
    <Form
      isLoading={submitting}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Airplane} onSubmit={handleSubmit} />
          <OpenGrokBotAction />
        </ActionPanel>
      }
    >
      <Form.Dropdown title="Bot" {...itemProps.botId}>
        {individuals.length > 0 ? (
          <Form.Dropdown.Section title="Bots">
            {individuals.map((bot) => (
              <Form.Dropdown.Item key={bot.id} value={bot.id} title={bot.name} icon={botListIcon(bot)} />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        {groups.length > 0 ? (
          <Form.Dropdown.Section title="Groups">
            {groups.map((bot) => (
              <Form.Dropdown.Item key={bot.id} value={bot.id} title={bot.name} icon={botListIcon(bot)} />
            ))}
          </Form.Dropdown.Section>
        ) : null}
        {hidden.length > 0 ? (
          <Form.Dropdown.Section title="Hidden">
            {hidden.map((bot) => (
              <Form.Dropdown.Item key={bot.id} value={bot.id} title={bot.name} icon={botListIcon(bot)} />
            ))}
          </Form.Dropdown.Section>
        ) : null}
      </Form.Dropdown>
      <Form.TextArea title="Task" placeholder="What should the bot do?" {...itemProps.message} />
    </Form>
  );
}
