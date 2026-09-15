export interface Todo {
  id: string;
  title: string;
  position: number;
  createdAt: number;
  completedAt?: number | null;
}

export interface Snapshot {
  todos: Todo[];
  undoCandidate?: Todo | null;
}

export type Mutation =
  | ["add", string]
  | ["edit", string, string]
  | ["complete", string]
  | ["undo", string]
  | ["undo-latest"]
  | ["move", string, "up" | "down"];

function isTodo(value: unknown): value is Todo {
  if (typeof value !== "object" || value === null) return false;
  const todo = value as Record<string, unknown>;
  return (
    typeof todo.id === "string" &&
    typeof todo.title === "string" &&
    typeof todo.position === "number" &&
    Number.isInteger(todo.position) &&
    typeof todo.createdAt === "number" &&
    Number.isFinite(todo.createdAt) &&
    (todo.completedAt == null ||
      (typeof todo.completedAt === "number" &&
        Number.isFinite(todo.completedAt)))
  );
}

export function parseSnapshot(raw: string): Snapshot {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error(
      "Could not read the companion response. Check your installed app.",
    );
  }
  if (typeof value !== "object" || value === null)
    throw new Error("Invalid companion response.");
  const snapshot = value as Record<string, unknown>;
  if (
    !Array.isArray(snapshot.todos) ||
    !snapshot.todos.every(isTodo) ||
    (snapshot.undoCandidate != null && !isTodo(snapshot.undoCandidate))
  ) {
    throw new Error(
      "Incompatible companion response. Update the super todo app.",
    );
  }
  return {
    todos: snapshot.todos,
    undoCandidate: snapshot.undoCandidate as Todo | null | undefined,
  };
}
