import { open, showInFinder } from "@raycast/api";

// ----------------------------------------------
// TERMINAL DETECTION & OPENING
// ----------------------------------------------

export async function openInTerminal(workspacePath: string): Promise<void> {
  open(workspacePath, "terminal");
}

// ----------------------------------------------
// REVEAL IN FINDER/EXPLORER
// ----------------------------------------------

export async function revealInFinder(workspacePath: string): Promise<void> {
  const normalizedPath = workspacePath.replace(/\//g, "\\");
  await showInFinder(normalizedPath);
}
