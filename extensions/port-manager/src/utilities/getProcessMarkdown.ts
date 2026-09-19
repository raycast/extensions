import Process from "../models/Process";
import codeBlock from "./codeBlock";

/** Process names and addresses come from other users' processes, so they are escaped before rendering. */
function escapeInline(value: string) {
  return value.replace(/[\\`*_{}[\]()#+\-.!|<>~]/g, (character) => `\\${character}`);
}

function inlineCode(value: string) {
  return `\`${value.replace(/`/g, "")}\``;
}

export function getProcessMarkdown(p: Process) {
  const sections = [`## ${escapeInline(p.name ?? "Untitled Process")}`];

  const addresses = (p.portInfo ?? []).map((i) => inlineCode(`${i.host}:${i.port}`));
  if (addresses.length > 0) {
    sections.push(`Listening on ${addresses.join(", ")}`);
  }

  if (p.commandLine !== undefined) {
    sections.push("**Command Line**", codeBlock(p.commandLine));
  }

  return sections.join("\n\n");
}
