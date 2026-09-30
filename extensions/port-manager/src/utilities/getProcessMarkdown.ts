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
  const ports = Array.from(new Set((p.portInfo ?? []).map((i) => i.port)));
  const name = escapeInline(p.name ?? "Untitled Process");

  const sections = [ports.length > 0 ? `## Port${ports.length > 1 ? "s" : ""} ${ports.join(", ")}` : `## ${name}`];

  const addresses = (p.portInfo ?? []).map((i) => inlineCode(`${i.host}:${i.port}`));
  if (addresses.length > 0) {
    sections.push(`**${name}** (PID ${p.pid}) is listening on ${addresses.join(", ")}`);
  }

  if (p.commandLine !== undefined) {
    sections.push("**Command Line**", codeBlock(p.commandLine));
  }

  return sections.join("\n\n");
}
