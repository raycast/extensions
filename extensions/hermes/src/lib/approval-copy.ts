/** Copy shared by the approval detail and its recovery state. */

import { type PlatformCopy, platformCopy } from "./platform";

/** A tecla que abre o painel de ações é a do sistema: `Ctrl+K` no Windows, `Cmd+K` no macOS. */
export function approvalActionHint(copy: PlatformCopy = platformCopy()): string {
  return `The choices live in Actions (${copy.actionsKeys}); use that panel to answer the request.`;
}

export function approvalDetailsLostHint(): string {
  return "The details of the request were lost when Raycast was closed. Without seeing the command, choose Deny.";
}
