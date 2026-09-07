import os from "node:os";
import path from "node:path";
import { ReferenceAction } from "./model";

export function expandHomePath(target: string): string {
  if (target === "~") return os.homedir();
  if (!target.startsWith("~/")) return target;
  return path.resolve(os.homedir(), target.slice(2));
}

export function sshUrl(target: string): string {
  return target.startsWith("ssh://") ? target : `ssh://${target}`;
}

export function obsidianUrl(target: string): string {
  if (target.startsWith("obsidian://")) return target;
  const separator = target.indexOf("/");
  if (separator === -1) return `obsidian://open?file=${encodeURIComponent(target)}`;
  const vault = target.slice(0, separator);
  const file = target.slice(separator + 1);
  return `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`;
}

export function actionUrl(action: ReferenceAction): string {
  if (action.kind === "pwd")
    throw new Error("Password actions copy their target and do not have a URL");
  if (action.kind === "open") return expandHomePath(action.target);
  if (action.kind === "ssh") return sshUrl(action.target);
  if (action.kind === "obsidian") return obsidianUrl(action.target);
  throw new Error(`Action "${action.kind}" does not have a built-in URL conversion`);
}
