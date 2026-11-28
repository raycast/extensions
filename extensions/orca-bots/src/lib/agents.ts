import type { Harness } from "./bots";

export type AgentSection = "attention" | "running" | "done";

export type OpenAgent = {
  /** Identifiant de session Orca ; l'adresse sert de repli quand il est absent. */
  sessionId: string;
  /** Adresse `term_…` à passer à « Aller voir » ; null pour un chat ou un terminal sans adresse. */
  terminalHandle: string | null;
  kind: "terminal" | "chat";
  /** État brut renvoyé par Orca (valeur inconnue conservée telle quelle). */
  state: string;
  section: AgentSection;
  harness: Harness;
  title: string;
  subtitle: string;
  lastPrompt: string | null;
  lastMessage: string | null;
  /** Début de l'état courant (ms), ou null. */
  stateSince: number | null;
  /** Dernière mise à jour (ms), 0 si inconnue. */
  updatedAt: number;
  repo: string;
  workspace: string;
  bot: string | null;
};

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asString = (value: unknown): string => (typeof value === "string" ? value : "");

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const UNTITLED = "Untitled Session";
const TITLE_MAX_LENGTH = 80;
const TERMINAL_PREFIX = "term_";
const CHAT_PREFIX = "orca_session_id:";

/** Orca tronque l'aperçu du dernier message à 200 caractères : à ce seuil, on marque la coupure. */
const PREVIEW_MAX_LENGTH = 200;

const previewOf = (message: string): string | null => {
  if (message === "") {
    return null;
  }
  return message.length >= PREVIEW_MAX_LENGTH ? `${message}…` : message;
};

/** `blocked` et `waiting` attendent Romain, `done` est terminé, tout le reste (dont une valeur future) reste visible en cours. */
export function sectionOf(state: string): AgentSection {
  if (state === "blocked" || state === "waiting") {
    return "attention";
  }
  return state === "done" ? "done" : "running";
}

/**
 * Premier candidat non vide qui ne commence pas par `<` (bruit du type `<local-command-caveat>`),
 * dans l'ordre : nom de conversation, titre de tâche, nom affiché, première ligne du prompt tronquée à 80 caractères.
 * Un candidat égal au nom du bot du worktree est ignoré : le nom d'un chat de bot est celui du bot,
 * ce qui rendrait tous ses chats identiques ; on retombe alors sur le prompt.
 */
export function displayTitle(
  agent: {
    conversationName?: string | null;
    taskTitle?: string | null;
    displayName?: string | null;
    prompt?: string | null;
  },
  botName?: string | null,
): string {
  const firstPromptLine = asString(agent.prompt)
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "");
  const truncatedPrompt =
    firstPromptLine === undefined
      ? ""
      : firstPromptLine.length > TITLE_MAX_LENGTH
        ? `${firstPromptLine.slice(0, TITLE_MAX_LENGTH)}…`
        : firstPromptLine;

  const candidates = [agent.conversationName, agent.taskTitle, agent.displayName].map(asString);
  candidates.push(truncatedPrompt);

  const trimmedBotName = botName?.trim() ?? "";

  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (trimmed !== "" && !trimmed.startsWith("<") && (trimmedBotName === "" || trimmed !== trimmedBotName)) {
      return trimmed;
    }
  }
  return UNTITLED;
}

/** Sous-titre d'une ligne : le bot s'il y en a un, sinon dépôt et espace de travail (le dépôt seul s'ils portent le même nom). */
export function subtitleOf(worktree: { bot?: string | null; repo?: string; displayName?: string }): string {
  if (worktree.bot) {
    return `Bot · ${worktree.bot}`;
  }
  const repo = worktree.repo ?? "";
  const workspace = worktree.displayName ?? "";
  return repo === workspace ? repo : `${repo} · ${workspace}`;
}

/**
 * Aplatit `worktrees[].agents[]` du `result` de `orca worktree ps`.
 * Un agent n'est écarté que s'il n'a ni `orcaSessionId` ni adresse : il ne pourrait alors être identifié.
 */
export function parseOpenAgents(result: unknown): OpenAgent[] {
  const worktrees = asRecord(result).worktrees;
  if (!Array.isArray(worktrees)) {
    return [];
  }

  const agents: OpenAgent[] = [];
  for (const rawWorktree of worktrees) {
    const worktree = asRecord(rawWorktree);
    if (!Array.isArray(worktree.agents)) {
      continue;
    }
    const repo = asString(worktree.repo);
    const workspace = asString(worktree.displayName);
    const bot = asString(worktree.bot) || null;
    const isFolderWorkspace = worktree.workspaceKind === "folder-workspace";

    for (const rawAgent of worktree.agents) {
      const agent = asRecord(rawAgent);
      const address = asString(agent.address);
      const sessionId = asString(agent.orcaSessionId) || address;
      if (!sessionId) {
        continue;
      }

      const hasTerminalHandle = address.startsWith(TERMINAL_PREFIX);
      const isChat = !hasTerminalHandle && (address.startsWith(CHAT_PREFIX) || isFolderWorkspace);
      const state = asString(agent.state);

      agents.push({
        sessionId,
        terminalHandle: hasTerminalHandle ? address : null,
        kind: isChat ? "chat" : "terminal",
        state,
        section: sectionOf(state),
        harness: asString(agent.agentType),
        title: displayTitle(
          {
            conversationName: asString(agent.conversationName),
            taskTitle: asString(agent.taskTitle),
            displayName: asString(agent.displayName),
            prompt: asString(agent.prompt),
          },
          bot,
        ),
        subtitle: subtitleOf({ bot, repo, displayName: workspace }),
        lastPrompt: asString(agent.prompt).trim() !== "" ? asString(agent.prompt) : null,
        lastMessage: previewOf(asString(agent.lastAssistantMessage)),
        stateSince: asNumber(agent.stateStartedAt),
        updatedAt: asNumber(agent.updatedAt) ?? 0,
        repo,
        workspace,
        bot,
      });
    }
  }
  return agents;
}

const SECTION_ORDER: { section: AgentSection; title: string }[] = [
  { section: "attention", title: "Waiting for Reply" },
  { section: "running", title: "In Progress" },
  { section: "done", title: "Done" },
];

/** Regroupe par section dans l'ordre fixe, omet les sections vides, trie chaque section du plus récent au plus ancien. */
export function groupBySection(agents: OpenAgent[]): { section: AgentSection; title: string; agents: OpenAgent[] }[] {
  return SECTION_ORDER.map(({ section, title }) => ({
    section,
    title,
    agents: agents.filter((agent) => agent.section === section).sort((a, b) => b.updatedAt - a.updatedAt),
  })).filter((group) => group.agents.length > 0);
}
