// Cleans noise Codex wraps around user messages.
// "compact" inlines markers for AI input; "preserve" relocates skill blocks for export.
export type CodexCleanMode = "compact" | "preserve";

export function cleanCodexUserMessage(
  raw: string,
  mode: CodexCleanMode,
): string {
  let out = raw.trim();

  out = stripAgentsPreamble(out);
  out = stripEnvironmentContext(out);
  out = stripTurnAborted(out);

  if (mode === "compact") {
    out = collapseSkillsToInlineMarker(out);
    out = compressFilesAttachmentBlock(out, "compact");
    out = out.replace(/<image[^>]*>\s*<\/image>\s*/g, "[image]\n");
  } else {
    out = collapseAndRelocateSkills(out);
    out = compressFilesAttachmentBlock(out, "preserve");
    out = out.replace(/<image[^>]*>\s*<\/image>\s*/g, "");
  }

  return out.replace(/\n{3,}/g, "\n\n").trim();
}

function stripAgentsPreamble(text: string): string {
  return text
    .replace(
      /^#\s*AGENTS\.md\s+instructions\s+for[\s\S]*?<\/environment_context>\s*/m,
      "",
    )
    .replace(
      /^#\s*AGENTS\.md\s+instructions\s+for[\s\S]*?<\/INSTRUCTIONS>\s*/m,
      "",
    );
}

function stripEnvironmentContext(text: string): string {
  return text.replace(
    /<environment_context>[\s\S]*?<\/environment_context>\s*/g,
    "",
  );
}

function stripTurnAborted(text: string): string {
  return text.replace(/<turn_aborted>[\s\S]*?<\/turn_aborted>\s*/g, "");
}

function collapseSkillsToInlineMarker(text: string): string {
  return text.replace(/<skill>[\s\S]*?<\/skill>/g, (match) => {
    const nameMatch = match.match(/<name>([\s\S]*?)<\/name>/);
    return nameMatch ? `[skill: ${nameMatch[1].trim()}]` : "[skill]";
  });
}

function collapseAndRelocateSkills(text: string): string {
  let out = text.replace(
    /<skill>([\s\S]*?)<\/skill>/g,
    (_match, inner: string) => {
      const nameMatch = inner.match(/<name>([\s\S]*?)<\/name>/);
      const pathMatch = inner.match(/<path>([\s\S]*?)<\/path>/);
      const fmMatch = inner.match(/^---\s*\n([\s\S]*?)\n---/m);
      const parts: string[] = ["<skill>"];
      if (nameMatch) parts.push(`<name>${nameMatch[1].trim()}</name>`);
      if (pathMatch) parts.push(`<path>${pathMatch[1].trim()}</path>`);
      if (fmMatch) {
        parts.push("---");
        parts.push(fmMatch[1].trim());
        parts.push("---");
      }
      parts.push("</skill>");
      return parts.join("\n");
    },
  );

  const skillBlocks: { name: string; block: string }[] = [];
  out = out.replace(/<skill>[\s\S]*?<\/skill>/g, (match) => {
    const nameMatch = match.match(/<name>([\s\S]*?)<\/name>/);
    skillBlocks.push({
      name: nameMatch ? nameMatch[1].trim() : "",
      block: match,
    });
    return "";
  });

  const unplacedBlocks: string[] = [];
  for (const { name, block } of skillBlocks) {
    if (!name) {
      unplacedBlocks.push(block);
      continue;
    }
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const mention = new RegExp(`\\$${escaped}\\b`);
    if (mention.test(out)) {
      out = out.replace(mention, (m) => `${m}\n\n${block}`);
    } else {
      unplacedBlocks.push(block);
    }
  }

  if (unplacedBlocks.length > 0) {
    out = `${unplacedBlocks.join("\n\n")}\n\n${out.trimStart()}`;
  }

  return out;
}

function compressFilesAttachmentBlock(
  text: string,
  mode: CodexCleanMode,
): string {
  return text.replace(
    /^#\s*Files mentioned by the user:\s*\n([\s\S]*?)##\s*My request for Codex:\s*\n*/m,
    (_match, filesBlock: string) => {
      const count = (filesBlock.match(/^##\s+/gm) || []).length;
      if (count === 0) return "";
      const noun = `${count} file${count === 1 ? "" : "s"}`;
      return mode === "compact"
        ? `[Attached: ${noun}]\n\n`
        : `_[Attached: ${noun}]_\n\n`;
    },
  );
}
