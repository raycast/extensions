import { getPreferenceValues } from "@raycast/api";
import { parseConnectionConfig, type ConnectionConfig } from "./config";
import { aiResult, findAiProject } from "./ai-projects";

export function withAiConnection<T>(operation: (config: ConnectionConfig) => Promise<T>) {
  return aiResult(() => operation(parseConnectionConfig(getPreferenceValues())));
}

export async function projectConfirmation(
  projectId: string,
  message: string,
  extra: { name: string; value: string }[] = [],
) {
  const project = await findAiProject(parseConnectionConfig(getPreferenceValues()), projectId);
  return {
    message,
    info: [{ name: "Project", value: project.name }, { name: "Project ID", value: project.id }, ...extra],
  };
}
