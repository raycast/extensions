import { WindowSnapshot } from "./aerospace";

function escapeRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function createWindowRule(window: WindowSnapshot): string {
  const condition = window.appBundleId
    ? `if.app-id = ${JSON.stringify(window.appBundleId)}`
    : `if.app-name-regex-substring = ${JSON.stringify(`^${escapeRegularExpression(window.appName)}$`)}`;
  const workspaceArgument = JSON.stringify(window.workspace);
  const layout = window.layout === "floating" ? "floating" : "tiling";
  const commands = [`move-node-to-workspace -- ${workspaceArgument}`, `layout ${layout}`];

  return [
    `# ${window.appName.replace(/\s+/g, " ").trim()}`,
    "[[on-window-detected]]",
    condition,
    `run = [${commands.map((command) => JSON.stringify(command)).join(", ")}]`,
  ].join("\n");
}
