import { getResumeDocument } from "../utils/resumeDocuments";

interface Input {
  /** Stable local document ID returned by list-resumes. Never guess IDs. */
  id: string;
}

export default async function getResume(input: Input) {
  return getResumeDocument(input.id);
}
