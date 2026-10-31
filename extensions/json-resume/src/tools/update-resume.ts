import { Tool } from "@raycast/api";
import { getResumeDocument, updateResumeDocument } from "../utils/resumeDocuments";

interface Input {
  /** Stable ID from list-resumes or get-resume. Read the current document before editing. */
  id: string;
  /** Saved document display title, separate from resume.basics.label. Keep the existing title for label edits; change it only for an explicit rename. */
  title: string;
  /** Complete replacement JSON Resume. For a label edit, change basics.label here. Preserve every field unrelated to the requested edit. */
  resumeJson: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const current = await getResumeDocument(input.id);
  return {
    message: "Replace this saved resume with the supplied JSON?",
    info: [
      { name: "Resume ID", value: input.id },
      { name: "Current Title", value: current.title },
      { name: "New Title", value: input.title },
    ],
  };
};

export default async function updateResume(input: Input) {
  const { id, title, updatedAt } = await updateResumeDocument(input);
  return { id, title, updatedAt };
}
