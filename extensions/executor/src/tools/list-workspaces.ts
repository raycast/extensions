import { listAiWorkspaces } from "../lib/workspace-ai";

/** List configured Executor workspaces without exposing API keys. */
export default function tool() {
  return listAiWorkspaces();
}
