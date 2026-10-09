import type { RegistryTool } from "../mise/registry";

export function docsUrl(tool: RegistryTool): string {
  const isCore = tool.backends.some((backend) => backend.startsWith("core:"));
  return isCore ? `https://mise.jdx.dev/lang/${tool.short}.html` : "https://mise.jdx.dev/registry.html";
}
