import { aiListProjectText } from "../lib/ai-editor";
import { withAiConnection } from "../lib/ai-runtime";

type Input = {
  /** Exact project ID from list-projects. Opens this project to inspect all text overlays. */
  projectId: string;
};
export default async function tool(input: Input) {
  return withAiConnection((config) => aiListProjectText(config, input.projectId));
}
