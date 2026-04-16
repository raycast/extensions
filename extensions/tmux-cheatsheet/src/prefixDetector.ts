import { showGlobalOption } from "./tmuxCli";

export function detectPrefix(): string | undefined {
  return showGlobalOption("prefix");
}
