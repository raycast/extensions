import { backendJson } from "./backend";
import { CLIENT } from "./config";

export type ColumnKind = "normal" | "next" | "projects" | "flexible";
export type ApiColumn = { id: string; kind: ColumnKind; label: string; order: number; cardIds: string[] };
export type ApiCard = {
  id: string;
  kind: "card" | "action" | "project";
  title: string;
  columnId: string;
  context?: string | null;
  projectId?: string | null;
  notes?: string | null;
  who?: string | null;
  since?: string | null;
  archived?: boolean;
};
export type ApiContext = { id: string; label: string; color: string; order?: number };
export type Board = { columns: ApiColumn[]; cards: ApiCard[]; contexts?: ApiContext[] };

export type ListRole = "inbox" | "next" | "projects" | "waiting" | "someday";

// Same six as the backend seed; only used when a board predates the contexts field.
export const DEFAULT_CONTEXTS: ApiContext[] = [
  { id: "calls", label: "@calls", color: "#d97444" },
  { id: "computer", label: "@computer", color: "#3a78c8" },
  { id: "errands", label: "@errands", color: "#4f9466" },
  { id: "desk", label: "@desk", color: "#8260c4" },
  { id: "home", label: "@home", color: "#c0588a" },
  { id: "office", label: "@office", color: "#3e9aa0" },
];
const UNKNOWN_CONTEXT_COLOR = "#7b8180";

const GTD = `/api/${CLIENT}/v2/gtd`;

export function fetchBoard(): Promise<Board> {
  return backendJson<Board>(`${GTD}/board`);
}

export type CreateCardRequest = { title: string; notes?: string; toIndex: number };

// A capture always goes to the top of Inbox.
export function captureToRequest(title: string, notes?: string): CreateCardRequest {
  const t = title.trim();
  const n = notes?.trim();
  return n ? { title: t, notes: n, toIndex: 0 } : { title: t, toIndex: 0 };
}

export function createCard(req: CreateCardRequest): Promise<ApiCard> {
  return backendJson<ApiCard>(`${GTD}/cards`, { method: "POST", body: JSON.stringify(req) });
}

export type MoveCardRequest = { toColumnId: string; toIndex?: number; kind?: ApiCard["kind"]; context?: string | null };

// Mirrors the web's convert-on-move: a card moved to Next becomes an action, to Projects a
// project, anywhere else a plain card.
export function moveToRoleRequest(target: ListRole, columnId: string, context?: string | null): MoveCardRequest {
  const kind: ApiCard["kind"] = target === "next" ? "action" : target === "projects" ? "project" : "card";
  const req: MoveCardRequest = { toColumnId: columnId, toIndex: 0, kind };
  if (target === "next") req.context = context ?? null;
  return req;
}

export function moveCard(cardId: string, req: MoveCardRequest): Promise<ApiCard> {
  return backendJson<ApiCard>(`${GTD}/cards/${encodeURIComponent(cardId)}/move`, {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export function updateCard(
  cardId: string,
  patch: Partial<Pick<ApiCard, "title" | "notes" | "context" | "who" | "since">>,
): Promise<ApiCard> {
  return backendJson<ApiCard>(`${GTD}/cards/${encodeURIComponent(cardId)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

// There is no delete — archiving is the only removal, same as every client.
export function archiveCard(cardId: string): Promise<ApiCard> {
  return backendJson<ApiCard>(`${GTD}/cards/${encodeURIComponent(cardId)}/archive`, { method: "POST" });
}

// Same resolution as the backend's findColumnByRole: kinds identify Inbox/Next/Projects, the
// two flexible columns are told apart by label.
export function columnByRole(columns: ApiColumn[], role: ListRole): ApiColumn | undefined {
  const sorted = [...columns].sort((a, b) => a.order - b.order);
  const label = (c: ApiColumn) => (c.label ?? "").toLowerCase();
  const isSomeday = (c: ApiColumn) => label(c).includes("someday") || label(c).includes("maybe");
  switch (role) {
    case "inbox":
      return sorted.find((c) => c.kind === "normal");
    case "next":
      return sorted.find((c) => c.kind === "next");
    case "projects":
      return sorted.find((c) => c.kind === "projects");
    case "waiting":
      return sorted.find((c) => c.kind === "flexible" && !isSomeday(c) && label(c).includes("waiting"));
    case "someday":
      return sorted.find((c) => c.kind === "flexible" && isSomeday(c));
  }
}

// Membership is column.cardIds (authoritative), never card.columnId; archived cards are out.
export function cardsInRole(board: Board, role: ListRole): ApiCard[] {
  const byId = new Map(board.cards.filter((c) => !c.archived).map((c) => [c.id, c]));
  return (columnByRole(board.columns, role)?.cardIds ?? []).map((id) => byId.get(id)).filter((c): c is ApiCard => !!c);
}

export function contextsOf(board: Board): Map<string, ApiContext> {
  const out = new Map<string, ApiContext>();
  const base = board.contexts?.length ? board.contexts : DEFAULT_CONTEXTS;
  for (const c of [...base].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) out.set(c.id, c);
  for (const c of board.cards) {
    if (c.context && !out.has(c.context))
      out.set(c.context, { id: c.context, label: "@" + c.context, color: UNKNOWN_CONTEXT_COLOR });
  }
  return out;
}

export function cardById(board: Board, id: string | null | undefined): ApiCard | undefined {
  return id ? board.cards.find((c) => c.id === id) : undefined;
}

// The next action pinned to a project: the first action in Next that points at it.
export function nextActionOf(board: Board, projectId: string): ApiCard | undefined {
  return cardsInRole(board, "next").find((a) => a.kind === "action" && a.projectId === projectId);
}

// `since` is whatever the user typed on the web ("Jun 28", "last Monday"); only a full ISO
// date is safe to count days from — anything else is shown verbatim.
export function daysSince(since: string | null | undefined, now: number = Date.now()): number | undefined {
  if (!since || !/^\d{4}-\d{2}-\d{2}/.test(since)) return undefined;
  const t = Date.parse(since);
  if (Number.isNaN(t)) return undefined;
  return Math.max(0, Math.floor((now - t) / 86_400_000));
}
