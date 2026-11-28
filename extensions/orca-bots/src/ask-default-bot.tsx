import { Action, ActionPanel, Icon, LaunchProps, List, openExtensionPreferences, useNavigation } from "@raycast/api";
import { BotList, PromptForm } from "./ask-bot";
import { AnswerView } from "./components/AnswerView";
import { OrcaGuard } from "./components/OrcaGuard";
import { type Bot, readBotFromFolder } from "./lib/bots";
import { getDefaultBotFolder } from "./lib/preferences";

/** Réponse du bot par défaut ; « Nouvelle question » rouvre le formulaire du même bot. */
function DefaultBotAnswer({ bot, prompt }: { bot: Bot; prompt: string }) {
  const { push } = useNavigation();
  return <AnswerView bot={bot} prompt={prompt} onAskAgain={() => push(<PromptForm bot={bot} />)} />;
}

export default function Command(props: LaunchProps<{ arguments: Arguments.AskDefaultBot }>) {
  const prompt = props.arguments.prompt.trim();
  const folder = getDefaultBotFolder();

  // Pas de bot par défaut : on choisit le bot, et la question part dès le choix.
  if (folder === undefined) {
    return (
      <OrcaGuard>
        <BotList prompt={prompt} />
      </OrcaGuard>
    );
  }

  const bot = readBotFromFolder(folder);
  if (bot === null) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Not an Orca Bot Folder"
          description={`${folder} does not contain a bot.json with an agent. Choose a folder inside ~/.orca/bots.`}
          actions={
            <ActionPanel>
              <Action title="Open Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <OrcaGuard>
      <DefaultBotAnswer bot={bot} prompt={prompt} />
    </OrcaGuard>
  );
}
