import { Tool } from "@raycast/api";
import { createResumeDocument } from "../utils/resumeDocuments";

interface Input {
  /** Display title for the new local resume. Duplicate titles are allowed. */
  title: string;
  /** Complete JSON Resume serialized as JSON. Include only supplied facts. */
  resumeJson: string;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => ({
  message: "Save a new resume inside the extension?",
  info: [{ name: "Title", value: input.title }],
});

export default async function saveResume(input: Input) {
  const { id, title, updatedAt } = await createResumeDocument(input);
  return { id, title, updatedAt };
}
