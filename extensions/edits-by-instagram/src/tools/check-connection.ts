import { aiConnectionStatus } from "../lib/ai-projects";
import { withAiConnection } from "../lib/ai-runtime";

export default async function tool() {
  return withAiConnection(aiConnectionStatus);
}
