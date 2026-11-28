import {
  Action,
  ActionPanel,
  Color,
  Form,
  Icon,
  LocalStorage,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useForm, usePromise } from "@raycast/utils";
import { useRef } from "react";
import { AnswerView } from "./components/AnswerView";
import { OrcaGuard } from "./components/OrcaGuard";
import { type Bot, parseBotList, readBotFolders, readBotFromFolder, sortBots } from "./lib/bots";
import { runOrca } from "./lib/orca-cli";
import { getDefaultBotFolder, getOrcaPath } from "./lib/preferences";

const LAST_BOT_KEY = "lastBotId";

async function loadBots(): Promise<Bot[]> {
  const result = await runOrca<unknown>(["bot", "list"], { orcaPath: getOrcaPath() });
  // Le dernier bot utilisé n'est qu'un confort : un stockage local en panne ne bloque pas la liste.
  let lastUsedId: string | undefined;
  try {
    lastUsedId = await LocalStorage.getItem<string>(LAST_BOT_KEY);
  } catch {
    lastUsedId = undefined;
  }
  return sortBots(parseBotList(result, readBotFolders()), lastUsedId, defaultBotId());
}

/** Id du bot par défaut des préférences, s'il pointe vers un dossier de bot valide. */
function defaultBotId(): string | undefined {
  const folder = getDefaultBotFolder();
  return folder ? (readBotFromFolder(folder)?.id ?? undefined) : undefined;
}

export function PromptForm({ bot }: { bot: Bot }) {
  const { push } = useNavigation();
  // Garde contre le double envoi : deux validations rapprochées lanceraient deux fois le prompt.
  const isSubmitting = useRef(false);

  const { handleSubmit, itemProps } = useForm<{ prompt: string }>({
    onSubmit: async ({ prompt }) => {
      if (isSubmitting.current) {
        return;
      }
      isSubmitting.current = true;
      try {
        try {
          await LocalStorage.setItem(LAST_BOT_KEY, bot.id);
        } catch {
          // Mémoriser le dernier bot est facultatif : on envoie le prompt quand même.
        }
        push(
          <AnswerView
            bot={bot}
            prompt={prompt}
            navigationTitle={bot.name}
            onAskAgain={() => push(<PromptForm bot={bot} />)}
          />,
        );
      } finally {
        isSubmitting.current = false;
      }
    },
    validation: {
      prompt: (value) => (value?.trim() ? undefined : "Enter a prompt for this bot."),
    },
  });

  return (
    <Form
      navigationTitle={bot.name}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Send" icon={Icon.Message} onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextArea title="Prompt" placeholder={`Message ${bot.name}…`} autoFocus {...itemProps.prompt} />
    </Form>
  );
}

/** Bot list. When `prompt` is provided (from "Ask Default Bot"), selecting a bot sends it immediately. */
export function BotList({ prompt }: { prompt?: string } = {}) {
  const { push } = useNavigation();
  const defaultId = defaultBotId();
  const {
    data: bots,
    isLoading,
    error,
  } = usePromise(loadBots, [], {
    failureToastOptions: { title: "Failed to List Bots" },
  });

  const writeToBot = (bot: Bot) => {
    if (bot.paused) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Bot is paused",
        message: "Resume it in Orca to send messages.",
      });
      return;
    }
    if (bot.folder === null) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Bot folder not found",
        message: "The bot.json file for this bot was not found in ~/.orca/bots.",
      });
      return;
    }
    if (!bot.harness) {
      void showToast({
        style: Toast.Style.Failure,
        title: "Bot misconfigured",
        message: "This bot has no agent configured in Orca.",
      });
      return;
    }
    if (prompt) {
      push(
        <AnswerView
          bot={bot}
          prompt={prompt}
          navigationTitle={bot.name}
          onAskAgain={() => push(<PromptForm bot={bot} />)}
        />,
      );
      return;
    }
    push(<PromptForm bot={bot} />);
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder={prompt ? "Which bot do you want to ask?" : "Search bots"}>
      {error ? (
        <List.EmptyView icon={Icon.Warning} title="Failed to List Bots" description={error.message} />
      ) : bots !== undefined && bots.length === 0 ? (
        // Vue vide personnalisée seulement si Orca n'a vraiment aucun bot : sinon, la vue vide de Raycast couvre « recherche sans résultat ».
        <List.EmptyView icon={Icon.Person} title="No Bots" description="Create a bot in Orca to start chatting." />
      ) : null}
      {(bots ?? []).map((bot) => (
        <List.Item
          key={bot.id}
          title={bot.name}
          subtitle={bot.specialty}
          icon={bot.paused ? { source: Icon.Pause, tintColor: Color.SecondaryText } : Icon.Person}
          accessories={[
            ...(bot.id === defaultId ? [{ tag: { value: "Default", color: Color.Blue } }] : []),
            ...(bot.harness ? [{ tag: bot.harness }] : []),
            ...(bot.paused ? [{ tag: "Paused" }] : []),
          ]}
          actions={
            <ActionPanel>
              <Action
                title={prompt ? "Send Question" : "Message Bot"}
                icon={Icon.Message}
                onAction={() => writeToBot(bot)}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <OrcaGuard>
      <BotList />
    </OrcaGuard>
  );
}
