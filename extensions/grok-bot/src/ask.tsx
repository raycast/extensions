import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LaunchProps,
  getSelectedText,
  openExtensionPreferences,
  popToRoot,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { useBots } from "./hooks/use-bots";
import { getLastBotId } from "./lib/last-bot";
import { resolveInitialBot } from "./lib/match-bot";
import { AgentId } from "./lib/types";
import { AskForm } from "./views/ask-form";
import { GatewayEmptyView } from "./views/gateway-empty";
import { OpenGrokBotAction } from "./views/open-grok-bot-action";

type AskArguments = {
  question?: string;
  bot?: string;
};

type Draft = {
  message: string;
  botId: AgentId | undefined;
};

export default function AskCommand(props: LaunchProps<{ arguments: AskArguments; fallbackText?: string }>) {
  const { bots, error, isLoading, revalidate } = useBots();
  const [selectedText, setSelectedText] = useState<string | null>(null);
  const [lastBotId, setLastBotIdState] = useState<AgentId | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getSelectedText()
        .then((value) => value.trim())
        .catch(() => ""),
      getLastBotId(),
    ]).then(([text, last]) => {
      if (!cancelled) {
        setSelectedText(text);
        setLastBotIdState(last);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const question = props.arguments.question?.trim() ?? "";
  const fallback = props.fallbackText?.trim() ?? "";
  const messageReady = selectedText !== null;
  const lastReady = lastBotId !== undefined;
  const rosterReady = !isLoading || bots.length > 0;
  const ready = messageReady && lastReady && rosterReady;

  if (!ready) {
    return <Form isLoading />;
  }

  if (error || bots.length === 0) {
    return (
      <List
        actions={
          <ActionPanel>
            <OpenGrokBotAction />
            <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
          </ActionPanel>
        }
      >
        <GatewayEmptyView error={error} onRetry={revalidate} />
      </List>
    );
  }

  const draft: Draft = {
    message: question || fallback || selectedText,
    botId: resolveInitialBot({
      bots,
      query: props.arguments.bot,
      lastId: lastBotId,
    })?.id,
  };

  return <AskForm bots={bots} initialBotId={draft.botId} initialMessage={draft.message} onSuccess={popToRoot} />;
}
