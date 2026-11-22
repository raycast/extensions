/** `unknown` couvre l'absence de `state` et toute valeur non gérée : ce n'est jamais une fin. */
export type TurnState = "done" | "working" | "unknown";

/** `role` vaut `user`, `assistant`, ou `error` pour une entrée d'erreur de la CLI. */
export type Entry = { role: "user" | "assistant" | "error" | string; text: string };

/** `limited` : la CLI a omis ou raccourci une partie de la conversation. */
export type Conversation = { state: TurnState; entries: Entry[]; limited: boolean };

const NO_ERROR_DETAIL = "Error without details.";

const asRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};

const asTurnState = (value: unknown): TurnState => (value === "done" || value === "working" ? value : "unknown");

/**
 * Transforme le `result` de `orca agent read` en conversation.
 * Juste après un launch, `state` est absent : « no state means unknown, never done ».
 * Garde les entrées `message` au texte non vide et les entrées `error` (rôle `error`, texte ou message) ;
 * les appels d'outils et les entrées en attente sont écartés.
 */
export function parseConversation(result: unknown): Conversation {
  const root = asRecord(result);
  const rawEntries = Array.isArray(root.entries) ? root.entries : [];

  const entries: Entry[] = [];
  for (const raw of rawEntries) {
    const record = asRecord(raw);
    if (record.kind === "error") {
      const detail = [record.text, record.message].find(
        (candidate): candidate is string => typeof candidate === "string" && candidate !== "",
      );
      entries.push({ role: "error", text: detail ?? NO_ERROR_DETAIL });
      continue;
    }
    if (record.kind !== "message" || typeof record.text !== "string" || record.text === "") {
      continue;
    }
    entries.push({ role: typeof record.role === "string" ? record.role : "", text: record.text });
  }

  return { state: asTurnState(root.state), entries, limited: root.limited === true };
}

/** Texte de la dernière entrée `assistant` placée après la dernière entrée `user`, sinon null. */
export function latestReply(conv: Conversation): string | null {
  for (let index = conv.entries.length - 1; index >= 0; index--) {
    const entry = conv.entries[index];
    if (entry.role === "assistant") {
      return entry.text;
    }
    if (entry.role === "user") {
      return null;
    }
  }
  return null;
}

/** Texte de l'erreur quand la dernière entrée après le dernier message utilisateur en est une, sinon null. */
export function latestError(conv: Conversation): string | null {
  const last = conv.entries[conv.entries.length - 1];
  return last?.role === "error" ? last.text : null;
}

/** Le bot a répondu quand le tour est terminé, qu'une réponse suit le dernier message utilisateur et qu'aucune erreur ne clôt l'échange. */
export function isAnswered(conv: Conversation): boolean {
  return conv.state === "done" && latestReply(conv) !== null && latestError(conv) === null;
}

/** Fusionne les entrées consécutives de même rôle en une seule (les fragments d'une même réponse), sans modifier l'entrée. */
export function mergeFragments(entries: Entry[]): Entry[] {
  const merged: Entry[] = [];
  for (const entry of entries) {
    const previous = merged[merged.length - 1];
    if (previous !== undefined && previous.role === entry.role && entry.role !== "error") {
      merged[merged.length - 1] = { role: previous.role, text: `${previous.text}\n\n${entry.text}` };
    } else {
      merged.push({ ...entry });
    }
  }
  return merged;
}
