import { Action, Tool } from "@raycast/api";
import { deleteResumeDocument, getResumeDocument } from "../utils/resumeDocuments";

interface Input {
  /** Stable ID of the local resume the user explicitly requested to delete. */
  id: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const document = await getResumeDocument(input.id);
  return {
    style: Action.Style.Destructive,
    message: "Delete this local resume?",
    info: [
      { name: "Resume ID", value: input.id },
      { name: "Title", value: document.title },
    ],
  };
};

export default async function deleteResume(input: Input) {
  await deleteResumeDocument(input.id);
  return { id: input.id, deleted: true };
}
