import { Action, ActionPanel, Color, Icon, Keyboard, List, closeMainWindow, useNavigation } from "@raycast/api";
import { showFailureToast, useCachedPromise, useCachedState } from "@raycast/utils";
import { useEffect } from "react";
import { ConversationView } from "./components/ConversationView";
import { OrcaGuard, openOrca } from "./components/OrcaGuard";
import { type AgentSection, type OpenAgent, groupBySection, parseOpenAgents } from "./lib/agents";
import { runOrca } from "./lib/orca-cli";
import { getOrcaPath } from "./lib/preferences";
import { quote } from "./lib/markdown";
import { formatSince } from "./lib/time";

const REFRESH_INTERVAL_MS = 5_000;

const SECTION_ICONS: Record<AgentSection, { source: Icon; tintColor: Color }> = {
  attention: { source: Icon.ExclamationMark, tintColor: Color.Orange },
  running: { source: Icon.CircleProgress, tintColor: Color.Blue },
  done: { source: Icon.CheckCircle, tintColor: Color.Green },
};

const STATE_LABELS: Record<string, string> = {
  working: "Working",
  blocked: "Blocked",
  waiting: "Waiting",
  done: "Done",
};

async function fetchOpenAgents(): Promise<OpenAgent[]> {
  return parseOpenAgents(await runOrca<unknown>(["worktree", "ps"], { orcaPath: getOrcaPath() }));
}

/** Markdown du panneau de détail : chaque section n'apparaît que si elle a du contenu. */
function detailMarkdown(agent: OpenAgent): string {
  const sections: string[] = [];
  if (agent.lastPrompt) {
    sections.push(`**Last Prompt**\n\n${quote(agent.lastPrompt)}`);
  }
  if (agent.lastMessage) {
    sections.push(`**Last Message**\n\n${agent.lastMessage}`);
  }
  return sections.join("\n\n");
}

/** « Go to Terminal » : cible le terminal, puis met Orca au premier plan. En cas d'échec de la CLI, Orca n'est pas ouvert. */
async function goToTerminal(handle: string): Promise<void> {
  try {
    await runOrca(["terminal", "switch", "--terminal", handle], { orcaPath: getOrcaPath() });
  } catch (error) {
    await showFailureToast(error, { title: "Failed to Open Terminal" });
    return;
  }
  // Un échec d'ouverture d'Orca affiche son propre toast ; la fenêtre Raycast reste alors ouverte.
  if (await openOrca()) {
    await closeMainWindow();
  }
}

const TOGGLE_DETAIL_SHORTCUT: Keyboard.Shortcut = { modifiers: ["cmd"], key: "d" };

type AgentItemProps = {
  agent: OpenAgent;
  onRefresh: () => void;
  showingDetail: boolean;
  onToggleDetail: () => void;
};

function AgentItem({ agent, onRefresh, showingDetail, onToggleDetail }: AgentItemProps) {
  const { push } = useNavigation();

  const readConversation = () =>
    push(<ConversationView sessionId={agent.sessionId} title={agent.title} bot={agent.bot} harness={agent.harness} />);
  const stateLabel = STATE_LABELS[agent.state] ?? (agent.state || "unknown");
  const since = agent.stateSince === null ? null : formatSince(agent.stateSince, Date.now());
  const handle = agent.terminalHandle;

  return (
    <List.Item
      // Identifiant stable : la sélection suit l'agent quand il change de section.
      id={agent.sessionId}
      title={agent.title}
      keywords={[agent.repo, agent.workspace, agent.bot ?? "", agent.harness].filter((keyword) => keyword !== "")}
      // Avec le panneau de détail, la liste n'a que la moitié de la largeur : on n'y garde que le titre,
      // le reste est dans les métadonnées du détail.
      subtitle={showingDetail ? undefined : agent.subtitle}
      icon={SECTION_ICONS[agent.section]}
      accessories={
        showingDetail ? [] : [{ tag: agent.harness || "unknown" }, ...(since === null ? [] : [{ text: since }])]
      }
      detail={
        <List.Item.Detail
          markdown={detailMarkdown(agent)}
          metadata={
            <List.Item.Detail.Metadata>
              <List.Item.Detail.Metadata.Label title="Project" text={agent.repo || "unknown"} />
              <List.Item.Detail.Metadata.Label title="Workspace" text={agent.workspace || "unknown"} />
              <List.Item.Detail.Metadata.Label title="Harness" text={agent.harness || "unknown"} />
              <List.Item.Detail.Metadata.Label
                title="State"
                text={since === null ? stateLabel : `${stateLabel} · ${since}`}
              />
              <List.Item.Detail.Metadata.Label title="Session ID" text={agent.sessionId} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={
        <ActionPanel>
          {handle !== null ? (
            <>
              <Action title="Go to Terminal" icon={Icon.Terminal} onAction={() => goToTerminal(handle)} />
              <Action title="Read Conversation" icon={Icon.Message} onAction={readConversation} />
            </>
          ) : (
            <>
              <Action title="Read Conversation" icon={Icon.Message} onAction={readConversation} />
              <Action title="Open Orca" icon={Icon.AppWindow} onAction={openOrca} />
            </>
          )}
          <Action
            title={showingDetail ? "Hide Details" : "Show Details"}
            icon={Icon.Sidebar}
            shortcut={TOGGLE_DETAIL_SHORTCUT}
            onAction={onToggleDetail}
          />
          <Action.CopyToClipboard
            title="Copy Session ID"
            content={agent.sessionId}
            shortcut={Keyboard.Shortcut.Common.Copy}
          />
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={onRefresh}
          />
        </ActionPanel>
      }
    />
  );
}

function AgentList() {
  const {
    data: agents,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(fetchOpenAgents, [], {
    failureToastOptions: { title: "Failed to List Agents" },
  });

  // Liste pleine largeur par défaut ; le choix du détail est mémorisé entre deux ouvertures.
  const [showingDetail, setShowingDetail] = useCachedState("showingDetail", false);
  const toggleDetail = () => setShowingDetail((current) => !current);

  // Rafraîchissement périodique ; les données en cache restent affichées pendant la relecture, donc pas de clignotement.
  useEffect(() => {
    const timer = setInterval(() => revalidate(), REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [revalidate]);

  return (
    // Chargement visible au premier fetch seulement : sinon la barre clignote à chaque rafraîchissement de 5 s.
    <List
      isLoading={isLoading && agents === undefined}
      isShowingDetail={showingDetail}
      searchBarPlaceholder="Search agents"
    >
      {error && agents === undefined ? (
        <List.EmptyView icon={Icon.Warning} title="Failed to List Agents" description={error.message} />
      ) : agents !== undefined && agents.length === 0 ? (
        <List.EmptyView
          icon={Icon.Person}
          title="No Open Agents"
          description="Start an agent in Orca to see it here."
        />
      ) : null}
      {groupBySection(agents ?? []).map((group) => (
        <List.Section key={group.section} title={group.title}>
          {group.agents.map((agent) => (
            <AgentItem
              key={agent.sessionId}
              agent={agent}
              onRefresh={revalidate}
              showingDetail={showingDetail}
              onToggleDetail={toggleDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}

export default function Command() {
  return (
    <OrcaGuard>
      <AgentList />
    </OrcaGuard>
  );
}
