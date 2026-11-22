import { Action, ActionPanel, Detail, Icon, Keyboard, Toast, showToast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { type Conversation, mergeFragments, parseConversation } from "../lib/conversation";
import { quote } from "../lib/markdown";
import { runOrca } from "../lib/orca-cli";
import { getOrcaPath } from "../lib/preferences";

const ENTRY_LIMIT = "50";
const FALLBACK_AUTHOR = "Agent";

type Props = {
  sessionId: string;
  /** Titre de navigation de la vue. */
  title: string;
  /** Nom du bot quand l'agent est un chat de bot : il sert d'en-tête à ses messages, avant le harness. */
  bot?: string | null;
  /** Nom du harness de l'agent, en-tête de ses messages à défaut de bot ; « Agent » s'il est vide ou absent. */
  harness?: string;
};

async function readConversation(sessionId: string): Promise<Conversation> {
  return parseConversation(
    await runOrca<unknown>(["agent", "read", sessionId, "--limit", ENTRY_LIMIT], { orcaPath: getOrcaPath() }),
  );
}

/** Texte du dernier message de l'agent (ni celui de l'utilisateur, ni une erreur), ou null. */
function lastAgentMessage(conversation: Conversation): string | null {
  for (let index = conversation.entries.length - 1; index >= 0; index--) {
    if (conversation.entries[index].role === "assistant") {
      return conversation.entries[index].text;
    }
  }
  return null;
}

function toMarkdown(conversation: Conversation, authorName: string): string {
  const blocks = conversation.entries.map((entry) => {
    if (entry.role === "error") {
      return `**Error**\n\n${quote(entry.text)}`;
    }
    return `**${entry.role === "user" ? "You" : authorName}**\n\n${entry.text}`;
  });
  if (conversation.state === "working") {
    blocks.push("*Working…*");
  }
  const text = blocks.join("\n\n---\n\n");
  return conversation.limited ? `*Partial conversation: Orca omitted or truncated older messages.*\n\n${text}` : text;
}

export function ConversationView({ sessionId, title, bot, harness }: Props) {
  // Le hook annule la mise à jour d'état au démontage : aucune lecture ne touche une vue fermée.
  const { data, isLoading, error, revalidate } = usePromise(readConversation, [sessionId], {
    onError: (readError) =>
      void showToast({
        style: Toast.Style.Failure,
        title: "Failed to Read Conversation",
        message: readError.message,
      }),
  });

  const authorName = bot?.trim() || harness?.trim() || FALLBACK_AUTHOR;
  // Les fragments consécutifs d'un même rôle passent sous un seul en-tête.
  const view = data ? { ...data, entries: mergeFragments(data.entries) } : undefined;
  const lastMessage = view ? lastAgentMessage(view) : null;

  let markdown: string;
  if (view) {
    markdown = view.entries.length > 0 || view.state === "working" ? toMarkdown(view, authorName) : "*No messages.*";
  } else if (error) {
    markdown = quote(`Failed to read conversation: ${error.message}`);
  } else {
    markdown = "";
  }

  return (
    <Detail
      navigationTitle={title}
      isLoading={isLoading}
      markdown={markdown}
      actions={
        <ActionPanel>
          {lastMessage !== null && <Action.CopyToClipboard title="Copy Last Message" content={lastMessage} />}
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={revalidate}
          />
        </ActionPanel>
      }
    />
  );
}
