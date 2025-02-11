import { LogItem } from "../types/log.types";
import { changeCase } from "../utils";

export function generateLogsMarkdown(logs: LogItem[]) {
  const messages = logs
    .map((log) => log.msg.replace(changeCase(log.phase.replaceAll("_", " "), "sentence"), ""))
    .map((msg) => "" + msg + "\n")
    .join("\n");

  return `
    ${messages}
  `;
}
