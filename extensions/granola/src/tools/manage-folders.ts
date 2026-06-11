import { Action, Tool } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  addDocumentToList,
  createDocumentList,
  deleteDocumentList,
  getDocumentList,
  removeDocumentFromList,
} from "../utils/granolaApi";
import { toError } from "../utils/errorUtils";

type Input = {
  action: "get" | "create" | "add-note" | "remove-note" | "delete";
  folderId?: string;
  noteId?: string;
  title?: string;
};

type Output =
  | Awaited<ReturnType<typeof getDocumentList>>
  | Awaited<ReturnType<typeof createDocumentList>>
  | Awaited<ReturnType<typeof addDocumentToList>>
  | Awaited<ReturnType<typeof removeDocumentFromList>>
  | Awaited<ReturnType<typeof deleteDocumentList>>
  | { error: string };

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  if (input.action === "get") return undefined;

  const actionLabels: Record<Exclude<Input["action"], "get">, string> = {
    create: "Create Folder",
    "add-note": "Add Note to Folder",
    "remove-note": "Remove Note from Folder",
    delete: "Delete Folder",
  };

  return {
    style: input.action === "delete" ? Action.Style.Destructive : Action.Style.Regular,
    message: `${actionLabels[input.action]} in Granola?`,
    info: [
      { name: "Folder ID", value: input.folderId },
      { name: "Note ID", value: input.noteId },
      { name: "Title", value: input.title },
    ],
  };
};

function requireString(value: string | undefined, name: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new Error(`${name} is required`);
  }
  return trimmed;
}

/**
 * Gets one folder, creates/deletes folders, or adds/removes notes from folders.
 * Mutating actions use Raycast tool confirmations.
 */
export default async function tool(input: Input): Promise<Output> {
  try {
    if (input.action === "get") {
      return await getDocumentList(requireString(input.folderId, "folderId"));
    }

    if (input.action === "create") {
      return await createDocumentList(requireString(input.title, "title"));
    }

    if (input.action === "add-note") {
      return await addDocumentToList(requireString(input.folderId, "folderId"), requireString(input.noteId, "noteId"));
    }

    if (input.action === "remove-note") {
      return await removeDocumentFromList(
        requireString(input.folderId, "folderId"),
        requireString(input.noteId, "noteId"),
      );
    }

    if (input.action === "delete") {
      return await deleteDocumentList(requireString(input.folderId, "folderId"));
    }

    return { error: `Unsupported action: ${(input as { action?: string }).action ?? "unknown"}` };
  } catch (error) {
    showFailureToast(toError(error), { title: "Failed to manage folder" });
    return { error: error instanceof Error ? error.message : String(error) };
  }
}
